// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================================
// LEGACY / DEPRECATED — kept for reference and history only.
// The application deploys and integrates with CritiqueDropBountyV2
// (see contracts/CritiqueDropBountyV2.sol, scripts/deploy.ts, and the ABI in
// lib/contracts.ts). Do NOT use this V1 contract for new deployments.
// ============================================================================

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev DEPRECATED: superseded by CritiqueDropBountyV2. Reference only.
contract CritiqueDropBounty is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Bounty {
        address founder;
        uint256 rewardPerSubmission;
        uint256 maxSubmissions;
        uint256 approvedCount;
        uint256 deadline;
        uint256 fundedAmount;
        uint256 paidAmount;
        string metadataURI;
        bool closed;
    }

    IERC20 public immutable usdc;
    uint256 public nextBountyId;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => mapping(address => bool)) public paidTester;
    mapping(uint256 => mapping(bytes32 => bool)) public usedSubmissionHash;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed founder,
        uint256 rewardPerSubmission,
        uint256 maxSubmissions,
        uint256 deadline,
        string metadataURI
    );

    event BountyFunded(uint256 indexed bountyId, address indexed founder, uint256 amount);
    event SubmissionApproved(uint256 indexed bountyId, address indexed tester, bytes32 indexed submissionHash);
    event TesterPaid(uint256 indexed bountyId, address indexed tester, uint256 amount);
    event BountyClosed(uint256 indexed bountyId);
    event UnusedRefunded(uint256 indexed bountyId, address indexed founder, uint256 amount);

    error BountyNotFound();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidTester();
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

    function createBounty(
        uint256 rewardPerSubmission,
        uint256 maxSubmissions,
        uint256 deadline,
        string calldata metadataURI
    ) external returns (uint256 bountyId) {
        if (rewardPerSubmission == 0) revert InvalidAmount();
        if (maxSubmissions == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        bountyId = nextBountyId;
        nextBountyId++;

        bounties[bountyId] = Bounty({
            founder: msg.sender,
            rewardPerSubmission: rewardPerSubmission,
            maxSubmissions: maxSubmissions,
            approvedCount: 0,
            deadline: deadline,
            fundedAmount: 0,
            paidAmount: 0,
            metadataURI: metadataURI,
            closed: false
        });

        emit BountyCreated(bountyId, msg.sender, rewardPerSubmission, maxSubmissions, deadline, metadataURI);
    }

    function fundBounty(uint256 bountyId, uint256 amount) external {
        Bounty storage bounty = _existingBounty(bountyId);
        if (amount == 0) revert InvalidAmount();

        bounty.fundedAmount += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit BountyFunded(bountyId, bounty.founder, amount);
    }

    function approveSubmission(uint256 bountyId, address tester, bytes32 submissionHash) external nonReentrant {
        Bounty storage bounty = _existingBounty(bountyId);
        if (msg.sender != bounty.founder) revert OnlyFounder();
        if (bounty.closed) revert BountyClosedError();
        if (tester == address(0)) revert InvalidTester();
        if (bounty.approvedCount >= bounty.maxSubmissions) revert MaxSubmissionsReached();
        if (paidTester[bountyId][tester]) revert TesterAlreadyPaid();
        if (usedSubmissionHash[bountyId][submissionHash]) revert SubmissionHashAlreadyUsed();
        if (remainingFunds(bountyId) < bounty.rewardPerSubmission) revert InsufficientBountyFunds();

        paidTester[bountyId][tester] = true;
        usedSubmissionHash[bountyId][submissionHash] = true;
        bounty.approvedCount++;
        bounty.paidAmount += bounty.rewardPerSubmission;

        emit SubmissionApproved(bountyId, tester, submissionHash);
        usdc.safeTransfer(tester, bounty.rewardPerSubmission);
        emit TesterPaid(bountyId, tester, bounty.rewardPerSubmission);
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

    function remainingFunds(uint256 bountyId) public view returns (uint256) {
        Bounty storage bounty = _existingBountyView(bountyId);
        return bounty.fundedAmount - bounty.paidAmount;
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
