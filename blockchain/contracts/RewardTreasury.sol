// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RewardTreasury {
    address public owner;
    bool public paused;
    mapping(bytes32 => bool) public paidClaims;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
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

    constructor(address initialOwner) {
        require(initialOwner != address(0), "RewardTreasury: invalid owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function payReward(
        bytes32 claimId,
        address payable recipient
    ) external payable onlyOwner whenNotPaused {
        require(claimId != bytes32(0), "RewardTreasury: invalid claim");
        require(recipient != address(0), "RewardTreasury: invalid recipient");
        require(msg.value > 0, "RewardTreasury: empty reward");
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
        address previousOwner = owner;
        owner = nextOwner;
        emit OwnershipTransferred(previousOwner, nextOwner);
    }
}
