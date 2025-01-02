// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TeamPoints is ERC20, Ownable {
    bool public isTransferable;
    bool public isOutsideTransferAllowed;
    uint256 public materialContributionWeight;
    mapping(address => bool) private hasReceivedTokens;
    mapping(address => uint256) private firstMintTime;

    event SettingsUpdated(bool isTransferable, bool isOutsideTransferAllowed, uint256 materialWeight);

    constructor(
        address initialOwner,
        bool _isTransferable,
        bool _isOutsideTransferAllowed,
        uint256 _materialWeight
    ) 
        ERC20("Team Points", "TPNT") 
        Ownable(initialOwner) 
    {
        isTransferable = _isTransferable;
        isOutsideTransferAllowed = _isOutsideTransferAllowed;
        materialContributionWeight = _materialWeight;
    }

    function getTimeWeight(address user) public view returns (uint256) {
        if (firstMintTime[user] == 0) return 2000;
        
        uint256 sixMonthPeriods = (block.timestamp - firstMintTime[user]) / (180 days);
        uint256 timeWeight = 2000 + (sixMonthPeriods * 125); 
        
        return timeWeight > 4000 ? 4000 : timeWeight;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(isTransferable || from == address(0), "Transfers are disabled");
        
        if (!isOutsideTransferAllowed && from != address(0)) {
            require(hasReceivedTokens[to], "Recipient must be an existing token holder");
        }

        super._update(from, to, value);
    }

    function mint(
        address to,
        uint256 monetaryAmount,
        uint256 timeAmount
    ) external onlyOwner {
        if (firstMintTime[to] == 0) {
            firstMintTime[to] = block.timestamp;
        }

        uint256 timeWeight = getTimeWeight(to);
        uint256 totalAmount = (monetaryAmount * materialContributionWeight) + 
                            (timeAmount * timeWeight) / 1000;
        
        _mint(to, totalAmount);
        
        if (!hasReceivedTokens[to]) {
            hasReceivedTokens[to] = true;
        }
    }

    function updateSettings(
        bool _isTransferable,
        bool _isOutsideTransferAllowed,
        uint256 _materialWeight
    ) external onlyOwner {
        isTransferable = _isTransferable;
        isOutsideTransferAllowed = _isOutsideTransferAllowed;
        materialContributionWeight = _materialWeight;
        
        emit SettingsUpdated(_isTransferable, _isOutsideTransferAllowed, _materialWeight);
    }
}