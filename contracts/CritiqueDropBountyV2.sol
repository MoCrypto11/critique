// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CritiqueDropBountyV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Bounty {
        address founder;
        uint256 fundedAmount;
        uint256 paidAmount;
        uint256 deadline;
        string metadataURI;
        bool closed;
    }

    struct FeedbackTypeConfig {
        uint256 rewardAmount;
        uint256 maxSlots;
        uint256 approvedCount;
        bool enabled;
    }

    IERC20 public immutable usdc;
    uint256 public nextBountyId;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => bytes32[]) private bountyFeedbackTypeIds;
    mapping(uint256 => mapping(bytes32 => FeedbackTypeConfig)) public feedbackTypeConfigs;
    mapping(uint256 => mapping(address => bool)) public paidTester;
    mapping(uint256 => mapping(bytes32 => bool)) public usedSubmissionHash;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed founder,
        uint256 totalFundingRequired,
        uint256 deadline,
        string metadataURI
    );
    event FeedbackTypeConfigured(
        uint256 indexed bountyId,
        bytes32 indexed feedbackTypeId,
        uint256 rewardAmount,
        uint256 maxSlots
    );
    event BountyFunded(uint256 indexed bountyId, address indexed founder, uint256 amount);
    event SubmissionApproved(
        uint256 indexed bountyId,
        bytes32 indexed feedbackTypeId,
        address indexed tester,
        bytes32 submissionHash
    );
    event TesterPaid(uint256 indexed bountyId, bytes32 indexed feedbackTypeId, address indexed tester, uint256 amount);
    event BountyClosed(uint256 indexed bountyId);
    event UnusedRefunded(uint256 indexed bountyId, address indexed founder, uint256 amount);

    error BountyNotFound();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidTester();
    error InvalidFeedbackType();
    error InvalidArrayLength();
    error DuplicateFeedbackType();
    error OnlyFounder();
    error BountyClosedError();
    error MaxSubmissionsReached();
    error TesterAlreadyPaid();
    error SubmissionHashAlreadyUsed();
    error InsufficientBountyFunds();
    error RefundUnavailable();

    constructor(address _usdc) {
        if (_usdc == address(0)) revert InvalidAmount();
        usdc = IERC20(_usdc);
    }

    function createAndFundBounty(
        bytes32[] calldata feedbackTypeIds,
        uint256[] calldata rewardAmounts,
        uint256[] calldata slotCounts,
        uint256 deadline,
        string calldata metadataURI
    ) external nonReentrant returns (uint256 bountyId) {
        if (deadline <= block.timestamp) revert InvalidDeadline();
        uint256 totalRequired = _totalFundingRequired(feedbackTypeIds, rewardAmounts, slotCounts);

        bountyId = nextBountyId;
        nextBountyId++;

        bounties[bountyId] = Bounty({
            founder: msg.sender,
            fundedAmount: totalRequired,
            paidAmount: 0,
            deadline: deadline,
            metadataURI: metadataURI,
            closed: false
        });

        for (uint256 i = 0; i < feedbackTypeIds.length; i++) {
            bytes32 feedbackTypeId = feedbackTypeIds[i];
            feedbackTypeConfigs[bountyId][feedbackTypeId] = FeedbackTypeConfig({
                rewardAmount: rewardAmounts[i],
                maxSlots: slotCounts[i],
                approvedCount: 0,
                enabled: true
            });
            bountyFeedbackTypeIds[bountyId].push(feedbackTypeId);
            emit FeedbackTypeConfigured(bountyId, feedbackTypeId, rewardAmounts[i], slotCounts[i]);
        }

        usdc.safeTransferFrom(msg.sender, address(this), totalRequired);

        emit BountyCreated(bountyId, msg.sender, totalRequired, deadline, metadataURI);
        emit BountyFunded(bountyId, msg.sender, totalRequired);
    }

    function approveSubmission(
        uint256 bountyId,
        bytes32 feedbackTypeId,
        address tester,
        bytes32 submissionHash
    ) external nonReentrant {
        Bounty storage bounty = _existingBounty(bountyId);
        FeedbackTypeConfig storage config = feedbackTypeConfigs[bountyId][feedbackTypeId];
        if (msg.sender != bounty.founder) revert OnlyFounder();
        if (bounty.closed) revert BountyClosedError();
        if (tester == address(0)) revert InvalidTester();
        if (!config.enabled) revert InvalidFeedbackType();
        if (config.approvedCount >= config.maxSlots) revert MaxSubmissionsReached();
        if (paidTester[bountyId][tester]) revert TesterAlreadyPaid();
        if (usedSubmissionHash[bountyId][submissionHash]) revert SubmissionHashAlreadyUsed();
        if (remainingFunds(bountyId) < config.rewardAmount) revert InsufficientBountyFunds();

        paidTester[bountyId][tester] = true;
        usedSubmissionHash[bountyId][submissionHash] = true;
        config.approvedCount++;
        bounty.paidAmount += config.rewardAmount;

        emit SubmissionApproved(bountyId, feedbackTypeId, tester, submissionHash);
        usdc.safeTransfer(tester, config.rewardAmount);
        emit TesterPaid(bountyId, feedbackTypeId, tester, config.rewardAmount);
    }

    function refundUnused(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _existingBounty(bountyId);
        if (msg.sender != bounty.founder) revert OnlyFounder();
        if (!bounty.closed && block.timestamp < bounty.deadline) revert RefundUnavailable();

        uint256 amount = remainingFunds(bountyId);
        if (amount == 0) revert InvalidAmount();

        bounty.fundedAmount = bounty.paidAmount;
        usdc.safeTransfer(bounty.founder, amount);

        emit UnusedRefunded(bountyId, bounty.founder, amount);
    }

    function closeBounty(uint256 bountyId) external {
        Bounty storage bounty = _existingBounty(bountyId);
        if (msg.sender != bounty.founder) revert OnlyFounder();
        if (bounty.closed) revert BountyClosedError();

        bounty.closed = true;
        emit BountyClosed(bountyId);
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return _existingBountyView(bountyId);
    }

    function getFeedbackTypeIds(uint256 bountyId) external view returns (bytes32[] memory) {
        _existingBountyView(bountyId);
        return bountyFeedbackTypeIds[bountyId];
    }

    function getFeedbackTypeConfig(uint256 bountyId, bytes32 feedbackTypeId)
        external
        view
        returns (FeedbackTypeConfig memory)
    {
        _existingBountyView(bountyId);
        FeedbackTypeConfig storage config = feedbackTypeConfigs[bountyId][feedbackTypeId];
        if (!config.enabled) revert InvalidFeedbackType();
        return config;
    }

    function remainingFunds(uint256 bountyId) public view returns (uint256) {
        Bounty storage bounty = _existingBountyView(bountyId);
        return bounty.fundedAmount - bounty.paidAmount;
    }

    function totalFundingRequired(
        bytes32[] calldata feedbackTypeIds,
        uint256[] calldata rewardAmounts,
        uint256[] calldata slotCounts
    ) external pure returns (uint256) {
        return _totalFundingRequired(feedbackTypeIds, rewardAmounts, slotCounts);
    }

    function _totalFundingRequired(
        bytes32[] calldata feedbackTypeIds,
        uint256[] calldata rewardAmounts,
        uint256[] calldata slotCounts
    ) internal pure returns (uint256 total) {
        if (
            feedbackTypeIds.length == 0 ||
            feedbackTypeIds.length != rewardAmounts.length ||
            feedbackTypeIds.length != slotCounts.length
        ) {
            revert InvalidArrayLength();
        }

        for (uint256 i = 0; i < feedbackTypeIds.length; i++) {
            if (feedbackTypeIds[i] == bytes32(0)) revert InvalidFeedbackType();
            if (rewardAmounts[i] == 0 || slotCounts[i] == 0) revert InvalidAmount();
            for (uint256 j = 0; j < i; j++) {
                if (feedbackTypeIds[j] == feedbackTypeIds[i]) revert DuplicateFeedbackType();
            }
            total += rewardAmounts[i] * slotCounts[i];
        }
    }

    function _existingBounty(uint256 bountyId) internal view returns (Bounty storage bounty) {
        bounty = bounties[bountyId];
        if (bounty.founder == address(0)) revert BountyNotFound();
    }

    function _existingBountyView(uint256 bountyId) internal view returns (Bounty storage bounty) {
        bounty = bounties[bountyId];
        if (bounty.founder == address(0)) revert BountyNotFound();
    }
}
