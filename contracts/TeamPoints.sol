// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Organization.sol";

contract TeamPoints is ERC20, Ownable {
    Organization public organization;
    mapping(address => uint256) private firstReceiptTime;

    constructor(address _organization, address initialOwner) 
        ERC20("Team Points", "TPNT") 
        Ownable(initialOwner) 
    {
        organization = Organization(_organization);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && firstReceiptTime[from] == 0) {
            firstReceiptTime[from] = block.timestamp;
        }

        if (from != address(0)) { // Skip check for minting
            require(block.timestamp >= firstReceiptTime[from] + 365 days, "Token transfers are locked for the first year");
        }
        
        require(organization.isMember(to), "Recipient is not a member of the organization");

        super._update(from, to, value);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(organization.isMember(to), "Recipient is not a member of the organization");
        _mint(to, amount);
        if (firstReceiptTime[to] == 0) {
            firstReceiptTime[to] = block.timestamp;
        }
    }

    function getFirstReceiptTime(address account) external view returns (uint256) {
        return firstReceiptTime[account];
    }
}
