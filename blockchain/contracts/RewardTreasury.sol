// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RewardTreasury {
    address public owner;
    address public pendingOwner;
    bool public paused;
    uint256 public immutable maxRewardWei;
    mapping(bytes32 => bool) public paidClaims;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed pendingOwner);
    event RewardPaid(
        bytes32 indexed claimId,
        address indexed recipient,
        uint256 amount
    );
    event RewardsPaused(bool paused);

    modifier onlyOwner() {
        require(msg.sender == owner, "RewardTreasury: owner required");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "RewardTreasury: rewards paused");
        _;
    }

    constructor(address initialOwner, uint256 initialMaxRewardWei) {
        require(initialOwner != address(0), "RewardTreasury: invalid owner");
        require(initialMaxRewardWei > 0, "RewardTreasury: invalid maximum");
        owner = initialOwner;
        paused = true;
        maxRewardWei = initialMaxRewardWei;
        emit OwnershipTransferred(address(0), initialOwner);
        emit RewardsPaused(true);
    }

    function payReward(
        bytes32 claimId,
        address payable recipient
    ) external payable onlyOwner whenNotPaused {
        require(claimId != bytes32(0), "RewardTreasury: invalid claim");
        require(recipient != address(0), "RewardTreasury: invalid recipient");
        require(msg.value > 0, "RewardTreasury: empty reward");
        require(msg.value <= maxRewardWei, "RewardTreasury: reward exceeds maximum");
        require(!paidClaims[claimId], "RewardTreasury: claim already paid");

        paidClaims[claimId] = true;
        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "RewardTreasury: transfer failed");

        emit RewardPaid(claimId, recipient, msg.value);
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
        emit RewardsPaused(nextPaused);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        require(nextOwner != address(0), "RewardTreasury: invalid owner");
        pendingOwner = nextOwner;
        emit OwnershipTransferStarted(owner, nextOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "RewardTreasury: pending owner required");
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }
}
