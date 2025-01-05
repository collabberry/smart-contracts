// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TeamPoints.sol";

/**
 * @title TeamPointsFactory
 * @dev Factory contract for creating new instances of TeamPoints.
 */
contract TeamPointsFactory {
    // Keep track of all deployed TeamPoints contract addresses
    address[] public allTeamPoints;

    // Logged when a new TeamPoints contract is created
    event TeamPointsCreated(
        address indexed contractAddress,
        address indexed initialOwner,
        string name,
        string symbol
    );

    /**
     * @notice Deploys a new TeamPoints contract, setting msg.sender as the initial admin.
     * @param isTransferable Whether tokens in the new contract can be transferred.
     * @param isOutsideTransferAllowed Whether tokens can be transferred to addresses that haven't received tokens before.
     * @param materialWeight The multiplier for material contributions in the minting calculation.
     * @param name The ERC20 name for the new TeamPoints token.
     * @param symbol The ERC20 symbol for the new TeamPoints token.
     * @return contractAddress The address of the newly deployed TeamPoints contract.
     */
    function createTeamPoints(
        bool isTransferable,
        bool isOutsideTransferAllowed,
        uint256 materialWeight,
        string memory name,
        string memory symbol
    )
        external
        returns (address contractAddress)
    {
        // Deploy a new TeamPoints contract
        TeamPoints newTeamPoints = new TeamPoints(
            msg.sender,                
            isTransferable,
            isOutsideTransferAllowed,
            materialWeight,
            name,
            symbol
        );

        // Store the address for future reference
        contractAddress = address(newTeamPoints);
        allTeamPoints.push(contractAddress);

        // Emit event to log the creation
        emit TeamPointsCreated(
            contractAddress, 
            msg.sender,      
            name, 
            symbol
        );

        return contractAddress;
    }

    /**
     * @notice Returns the total number of TeamPoints contracts deployed by this factory.
     */
    function getTeamPointsCount() external view returns (uint256) {
        return allTeamPoints.length;
    }

    /**
     * @notice Returns the entire list of deployed TeamPoints addresses.
     */
    function getAllTeamPoints() external view returns (address[] memory) {
        return allTeamPoints;
    }
}
