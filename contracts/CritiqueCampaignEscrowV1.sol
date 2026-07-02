// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CritiqueCampaignEscrowV1
/// @notice Escrow for founder-created feedback campaigns with optional
///         agent-managed queued payouts.
///
///         The agent operates the workflow. The contract protects the money:
///         - Founders fund a campaign budget in USDC. The contract holds it.
///         - Tasks cap the reward per submission (never above maxRewardPerTask).
///         - An authorized AI agent may only QUEUE payouts, and only while
///           autoPayEnabled, before the deadline, within task/budget limits.
///         - Queued payouts sit in a dispute window during which the founder
///           can cancel. The agent can never withdraw or redirect funds.
///         - Reserved accounting: queued amounts are reserved and cannot be
///           refunded away from a pending contributor payout.
///
///         Deadline rules (documented design choice):
///         - New submissions and agent queueing stop at the deadline.
///         - A payout queued BEFORE the deadline remains executable after it
///           (contributor protection; the founder can still cancel it).
///         - Founder manual approve-and-pay is allowed after the deadline
///           until the campaign is closed — the founder owns the budget and
///           may alternatively refund unused funds.
///
///         Pause freezes all payout activity (queue, founder pay, execute).
///         Close stops new tasks/queues/founder payouts, but already-queued
///         payouts stay reserved and executable unless the founder cancels
///         them individually.
///
///         Cancel semantics: the founder may cancel a payout at any time
///         while it is still queued (a superset of the dispute window). A
///         cancelled submission hash is permanently blocked from re-queueing
///         (prevents agent replay); the task/contributor slot is freed so a
///         revised submission (new hash) can still be rewarded.
///
///         Feedback content, acceptance criteria, and AI evaluations live
///         offchain. Only hashes/URIs are stored here for auditability.
contract CritiqueCampaignEscrowV1 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum PayoutState {
        None,
        Queued,
        Paid,
        Cancelled
    }

    struct Campaign {
        address founder;
        address allowedAgent;
        uint256 totalBudget; // total USDC funded (minus refunds)
        uint256 spent; // paid out to contributors
        uint256 reserved; // held for queued payouts
        uint256 maxRewardPerTask;
        uint256 deadline; // unix seconds; gates submissions + new queues
        uint64 disputeWindow; // seconds a queued payout can be cancelled in
        bool autoPayEnabled; // agent may queue payouts
        bool paused;
        bool closed;
        bytes32 criteriaHash; // hash of offchain acceptance criteria
        string metadataURI; // offchain campaign brief
    }

    struct Task {
        uint256 campaignId;
        uint256 reward; // USDC per approved submission; <= maxRewardPerTask
        uint32 maxPayouts;
        uint32 startedCount; // queued + paid, counts against maxPayouts
        bool active; // published and open for submissions
        bool closed;
        bytes32 criteriaHash;
        string metadataURI;
    }

    struct Payout {
        uint256 taskId;
        address contributor;
        uint256 amount;
        uint64 queuedAt;
        PayoutState state;
        bytes32 evaluationHash; // hash of offchain AI evaluation
        string evaluationURI;
    }

    IERC20 public immutable usdc;
    uint64 public constant MAX_DISPUTE_WINDOW = 30 days;

    uint256 public nextCampaignId;
    uint256 public nextTaskId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Task) public tasks;
    mapping(uint256 => uint256[]) private campaignTaskIds;
    // campaignId => submissionHash => payout record (also marks used hashes)
    mapping(uint256 => mapping(bytes32 => Payout)) private payouts;
    // taskId => contributor => already queued/paid on this task
    mapping(uint256 => mapping(address => bool)) public taskContributorStarted;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed founder,
        address indexed allowedAgent,
        uint256 initialFunding,
        uint256 maxRewardPerTask,
        uint256 deadline,
        uint64 disputeWindow,
        bool autoPayEnabled,
        string metadataURI
    );
    event CampaignFunded(uint256 indexed campaignId, uint256 amount, uint256 totalBudget);
    event TaskCreated(
        uint256 indexed taskId,
        uint256 indexed campaignId,
        uint256 reward,
        uint32 maxPayouts,
        bool active,
        string metadataURI
    );
    event TaskStatusChanged(uint256 indexed taskId, bool active, bool closed);
    event PayoutQueued(
        uint256 indexed campaignId,
        uint256 indexed taskId,
        bytes32 indexed submissionHash,
        address contributor,
        uint256 amount,
        uint64 executableAt,
        bytes32 evaluationHash,
        string evaluationURI
    );
    event QueuedPayoutCancelled(uint256 indexed campaignId, bytes32 indexed submissionHash, uint256 amountReleased);
    event PayoutExecuted(
        uint256 indexed campaignId,
        uint256 indexed taskId,
        bytes32 indexed submissionHash,
        address contributor,
        uint256 amount,
        bool direct // true = founder approve-and-pay, false = queued execution
    );
    event SubmissionRejected(uint256 indexed campaignId, bytes32 indexed submissionHash);
    event CampaignPauseSet(uint256 indexed campaignId, bool paused);
    event CampaignClosed(uint256 indexed campaignId);
    event UnusedRefunded(uint256 indexed campaignId, address indexed founder, uint256 amount);
    event AllowedAgentUpdated(uint256 indexed campaignId, address indexed agent);
    event AutoPayUpdated(uint256 indexed campaignId, bool enabled);

    error CampaignNotFound();
    error TaskNotFound();
    error OnlyFounder();
    error OnlyAgent();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidDisputeWindow();
    error InvalidContributor();
    error AgentRequired();
    error RewardExceedsMax();
    error AutoPayDisabled();
    error CampaignPausedError();
    error CampaignClosedError();
    error DeadlinePassed();
    error TaskNotActive();
    error TaskExhausted();
    error ContributorAlreadyPaid();
    error SubmissionHashUsed();
    error InsufficientBudget();
    error NotQueued();
    error DisputeWindowActive();
    error RefundUnavailable();

    constructor(address _usdc) {
        if (_usdc == address(0)) revert InvalidAmount();
        usdc = IERC20(_usdc);
    }

    // ─── Campaign lifecycle ────────────────────────────────────────────────

    function createCampaign(
        address allowedAgent,
        uint256 initialFunding,
        uint256 maxRewardPerTask,
        uint256 deadline,
        uint64 disputeWindow,
        bool autoPayEnabled,
        string calldata metadataURI,
        bytes32 criteriaHash
    ) external nonReentrant returns (uint256 campaignId) {
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (maxRewardPerTask == 0) revert InvalidAmount();
        if (disputeWindow > MAX_DISPUTE_WINDOW) revert InvalidDisputeWindow();
        if (autoPayEnabled && allowedAgent == address(0)) revert AgentRequired();

        campaignId = nextCampaignId;
        nextCampaignId++;

        campaigns[campaignId] = Campaign({
            founder: msg.sender,
            allowedAgent: allowedAgent,
            totalBudget: initialFunding,
            spent: 0,
            reserved: 0,
            maxRewardPerTask: maxRewardPerTask,
            deadline: deadline,
            disputeWindow: disputeWindow,
            autoPayEnabled: autoPayEnabled,
            paused: false,
            closed: false,
            criteriaHash: criteriaHash,
            metadataURI: metadataURI
        });

        if (initialFunding > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), initialFunding);
        }

        emit CampaignCreated(
            campaignId,
            msg.sender,
            allowedAgent,
            initialFunding,
            maxRewardPerTask,
            deadline,
            disputeWindow,
            autoPayEnabled,
            metadataURI
        );
    }

    function fundCampaign(uint256 campaignId, uint256 amount) external nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (campaign.closed) revert CampaignClosedError();
        if (amount == 0) revert InvalidAmount();

        campaign.totalBudget += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit CampaignFunded(campaignId, amount, campaign.totalBudget);
    }

    function setAllowedAgent(uint256 campaignId, address agent) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (campaign.autoPayEnabled && agent == address(0)) revert AgentRequired();
        campaign.allowedAgent = agent;
        emit AllowedAgentUpdated(campaignId, agent);
    }

    function setAutoPayEnabled(uint256 campaignId, bool enabled) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (enabled && campaign.allowedAgent == address(0)) revert AgentRequired();
        campaign.autoPayEnabled = enabled;
        emit AutoPayUpdated(campaignId, enabled);
    }

    function setCampaignPaused(uint256 campaignId, bool paused) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (campaign.closed) revert CampaignClosedError();
        campaign.paused = paused;
        emit CampaignPauseSet(campaignId, paused);
    }

    function closeCampaign(uint256 campaignId) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (campaign.closed) revert CampaignClosedError();
        campaign.closed = true;
        emit CampaignClosed(campaignId);
    }

    /// @notice Refund funds that are neither spent nor reserved for queued
    ///         payouts. Available after the deadline or once closed.
    function refundUnusedBudget(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (!campaign.closed && block.timestamp < campaign.deadline) revert RefundUnavailable();

        uint256 committed = campaign.spent + campaign.reserved;
        uint256 amount = campaign.totalBudget - committed;
        if (amount == 0) revert InvalidAmount();

        campaign.totalBudget = committed;
        usdc.safeTransfer(campaign.founder, amount);
        emit UnusedRefunded(campaignId, campaign.founder, amount);
    }

    // ─── Tasks ─────────────────────────────────────────────────────────────

    function createTask(
        uint256 campaignId,
        uint256 reward,
        uint32 maxPayouts,
        bool publish,
        string calldata metadataURI,
        bytes32 criteriaHash
    ) external returns (uint256 taskId) {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (campaign.closed) revert CampaignClosedError();
        if (reward == 0) revert InvalidAmount();
        if (reward > campaign.maxRewardPerTask) revert RewardExceedsMax();
        if (maxPayouts == 0) revert InvalidAmount();

        taskId = nextTaskId;
        nextTaskId++;

        tasks[taskId] = Task({
            campaignId: campaignId,
            reward: reward,
            maxPayouts: maxPayouts,
            startedCount: 0,
            active: publish,
            closed: false,
            criteriaHash: criteriaHash,
            metadataURI: metadataURI
        });
        campaignTaskIds[campaignId].push(taskId);

        emit TaskCreated(taskId, campaignId, reward, maxPayouts, publish, metadataURI);
    }

    function setTaskActive(uint256 taskId, bool active) external {
        Task storage task = _task(taskId);
        Campaign storage campaign = _campaign(task.campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        if (task.closed) revert TaskNotActive();
        task.active = active;
        emit TaskStatusChanged(taskId, active, task.closed);
    }

    function closeTask(uint256 taskId) external {
        Task storage task = _task(taskId);
        Campaign storage campaign = _campaign(task.campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();
        task.active = false;
        task.closed = true;
        emit TaskStatusChanged(taskId, false, true);
    }

    // ─── Payouts ───────────────────────────────────────────────────────────

    /// @notice Founder manual approval: pays the contributor immediately.
    function founderApproveAndPay(
        uint256 campaignId,
        uint256 taskId,
        address contributor,
        bytes32 submissionHash,
        bytes32 evaluationHash,
        string calldata evaluationURI
    ) external nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();

        Task storage task = _validatePayoutTarget(campaign, campaignId, taskId, contributor, submissionHash);

        taskContributorStarted[taskId][contributor] = true;
        task.startedCount++;
        campaign.spent += task.reward;
        payouts[campaignId][submissionHash] = Payout({
            taskId: taskId,
            contributor: contributor,
            amount: task.reward,
            queuedAt: uint64(block.timestamp),
            state: PayoutState.Paid,
            evaluationHash: evaluationHash,
            evaluationURI: evaluationURI
        });

        usdc.safeTransfer(contributor, task.reward);
        emit PayoutExecuted(campaignId, taskId, submissionHash, contributor, task.reward, true);
    }

    /// @notice Authorized agent queues a payout; funds are reserved and the
    ///         payout becomes executable after the dispute window.
    function agentQueuePayout(
        uint256 campaignId,
        uint256 taskId,
        address contributor,
        bytes32 submissionHash,
        bytes32 evaluationHash,
        string calldata evaluationURI
    ) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.allowedAgent) revert OnlyAgent();
        if (!campaign.autoPayEnabled) revert AutoPayDisabled();
        if (block.timestamp > campaign.deadline) revert DeadlinePassed();

        Task storage task = _validatePayoutTarget(campaign, campaignId, taskId, contributor, submissionHash);

        taskContributorStarted[taskId][contributor] = true;
        task.startedCount++;
        campaign.reserved += task.reward;
        payouts[campaignId][submissionHash] = Payout({
            taskId: taskId,
            contributor: contributor,
            amount: task.reward,
            queuedAt: uint64(block.timestamp),
            state: PayoutState.Queued,
            evaluationHash: evaluationHash,
            evaluationURI: evaluationURI
        });

        emit PayoutQueued(
            campaignId,
            taskId,
            submissionHash,
            contributor,
            task.reward,
            uint64(block.timestamp) + campaign.disputeWindow,
            evaluationHash,
            evaluationURI
        );
    }

    /// @notice Founder cancels a queued payout while it is still queued.
    ///         Releases the reserved amount and frees the task/contributor
    ///         slot; the submission hash stays permanently blocked.
    function founderCancelQueuedPayout(uint256 campaignId, bytes32 submissionHash) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();

        Payout storage payout = payouts[campaignId][submissionHash];
        if (payout.state != PayoutState.Queued) revert NotQueued();

        Task storage task = tasks[payout.taskId];
        payout.state = PayoutState.Cancelled;
        campaign.reserved -= payout.amount;
        task.startedCount--;
        taskContributorStarted[payout.taskId][payout.contributor] = false;

        emit QueuedPayoutCancelled(campaignId, submissionHash, payout.amount);
    }

    /// @notice Executes a queued payout after the dispute window. Callable by
    ///         anyone (contributor, agent, founder) — the destination and
    ///         amount are fixed at queue time.
    function executeQueuedPayout(uint256 campaignId, bytes32 submissionHash) external nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (campaign.paused) revert CampaignPausedError();

        Payout storage payout = payouts[campaignId][submissionHash];
        if (payout.state != PayoutState.Queued) revert NotQueued();
        if (block.timestamp < uint256(payout.queuedAt) + campaign.disputeWindow) revert DisputeWindowActive();

        payout.state = PayoutState.Paid;
        campaign.reserved -= payout.amount;
        campaign.spent += payout.amount;

        usdc.safeTransfer(payout.contributor, payout.amount);
        emit PayoutExecuted(campaignId, payout.taskId, submissionHash, payout.contributor, payout.amount, false);
    }

    /// @notice Founder pre-blocks a submission hash so the agent can never
    ///         queue it (offchain the submission is marked rejected).
    function founderRejectSubmission(uint256 campaignId, bytes32 submissionHash) external {
        Campaign storage campaign = _campaign(campaignId);
        if (msg.sender != campaign.founder) revert OnlyFounder();

        Payout storage payout = payouts[campaignId][submissionHash];
        if (payout.state != PayoutState.None) revert SubmissionHashUsed();
        payout.state = PayoutState.Cancelled;

        emit SubmissionRejected(campaignId, submissionHash);
    }

    // ─── Views ─────────────────────────────────────────────────────────────

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        Campaign memory campaign = campaigns[campaignId];
        if (campaign.founder == address(0)) revert CampaignNotFound();
        return campaign;
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        Task memory task = tasks[taskId];
        if (task.reward == 0) revert TaskNotFound();
        return task;
    }

    function getTaskIds(uint256 campaignId) external view returns (uint256[] memory) {
        if (campaigns[campaignId].founder == address(0)) revert CampaignNotFound();
        return campaignTaskIds[campaignId];
    }

    function getPayout(uint256 campaignId, bytes32 submissionHash) external view returns (Payout memory) {
        return payouts[campaignId][submissionHash];
    }

    function remainingBudget(uint256 campaignId) public view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.founder == address(0)) revert CampaignNotFound();
        return campaign.totalBudget - campaign.spent - campaign.reserved;
    }

    // ─── Internal ──────────────────────────────────────────────────────────

    function _campaign(uint256 campaignId) internal view returns (Campaign storage campaign) {
        campaign = campaigns[campaignId];
        if (campaign.founder == address(0)) revert CampaignNotFound();
    }

    function _task(uint256 taskId) internal view returns (Task storage task) {
        task = tasks[taskId];
        if (task.reward == 0) revert TaskNotFound();
    }

    /// @dev Shared checks for founder direct payouts and agent queueing.
    function _validatePayoutTarget(
        Campaign storage campaign,
        uint256 campaignId,
        uint256 taskId,
        address contributor,
        bytes32 submissionHash
    ) internal view returns (Task storage task) {
        if (campaign.paused) revert CampaignPausedError();
        if (campaign.closed) revert CampaignClosedError();
        if (contributor == address(0)) revert InvalidContributor();

        task = _task(taskId);
        if (task.campaignId != campaignId) revert TaskNotFound();
        if (!task.active || task.closed) revert TaskNotActive();
        if (task.startedCount >= task.maxPayouts) revert TaskExhausted();
        if (taskContributorStarted[taskId][contributor]) revert ContributorAlreadyPaid();
        if (payouts[campaignId][submissionHash].state != PayoutState.None) revert SubmissionHashUsed();
        if (campaign.spent + campaign.reserved + task.reward > campaign.totalBudget) revert InsufficientBudget();
    }
}
