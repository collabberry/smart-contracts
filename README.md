

# Collabberry Smart Contract Documentation

## Overview

Collabberry leverages a unique compensation model that includes Team Points (TPNT), representing ownership within the organization. These Team Points are managed through a smart contract system composed of two main contracts: `Organization.sol` and `TeamPoints.sol`. This documentation provides an overview of the contracts, their functionalities, and their roles in supporting Collabberry’s mission of fair and transparent compensation.

## Contracts

### Organization.sol

The `Organization` contract manages the membership of contributors within the organization. It defines who can participate in the Team Points system and ensures that only members can receive and transfer these tokens.

#### Features:
- **Owner Management:** Inherits ownership functionalities from OpenZeppelin's `Ownable` contract.
- **Member Management:** Functions to add and remove members, ensuring only authorized individuals can participate.
- **Metadata:** Stores metadata related to the organization.
- **Team Points:** Initializes and manages the associated `TeamPoints` contract.

#### Key Functions:

1. **addMember**
   ```solidity
   function addMember(address _member) external onlyOwner
   ```
   Adds a new member to the organization.

2. **removeMember**
   ```solidity
   function removeMember(address _member) external onlyOwner
   ```
   Removes an existing member from the organization.

3. **isMember**
   ```solidity
   function isMember(address _member) external view returns (bool)
   ```
   Checks if an address is a member of the organization.

### TeamPoints.sol

The `TeamPoints` contract is an ERC20 token that represents ownership and contribution within the organization. It ensures that these tokens are only transferable within the organization and introduces a lock-up period to prevent immediate transfers.

#### Features:
- **Token Standards:** Inherits ERC20 functionalities from OpenZeppelin's implementation.
- **Ownership Management:** Inherits ownership functionalities from OpenZeppelin's `Ownable` contract.
- **Membership Integration:** Ensures that only members of the organization can receive and transfer tokens.
- **Transfer Lock-Up:** Implements a lock-up period for token transfers.

#### Key Functions:

1. **_update**
   ```solidity
   function _update(address from, address to, uint256 value) internal override
   ```
   Overrides the ERC20 `_update` function to include membership checks and transfer lock-up logic.

2. **mint**
   ```solidity
   function mint(address to, uint256 amount) external onlyOwner
   ```
   Mints new Team Points to a specified member.

3. **getFirstReceiptTime**
   ```solidity
   function getFirstReceiptTime(address account) external view returns (uint256)
   ```
   Returns the timestamp of when a member first received Team Points.

## How It Works

### Integration with Collabberry

The smart contracts plays a crucial role to ensure transparency and legitimacy of the ownership distributed by the algorithm. It is essential to have the Team Points as a smart contract, to make sure the that the system and admins are fair and can't hide or game the system. The TPNT set the foundation of the Dynamic Compensation that Collabberry aims to be:

   - Team Points are dynamically allocated based on contributions.
   - The `TeamPoints` contract ensures only members can receive and transfer points, with a lock-up period to encourage long-term commitment.

### Security and Transparency

- **Role Management:** Only the owner can add/remove members and mint Team Points, ensuring control and preventing unauthorized actions.
- **Transfer Restrictions:** Transfers are restricted to members, and a lock-up period prevents immediate liquidation, promoting stability.

## Conclusion

The `Organization` and `TeamPoints` contracts form the backbone of Collabberry's compensation model, ensuring fair distribution of ownership and fostering a collaborative environment. By integrating these contracts, Collabberry empowers contributors with transparency and equity, aligning with its mission to revolutionize teamwork compensation.


## Deployed on Testnet

```Organization deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3```