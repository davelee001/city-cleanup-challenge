// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RejectingReceiver {
    receive() external payable {
        revert("RejectingReceiver: rejected");
    }
}
