# TeamPoints Contract

**TeamPoints** is an ERC20-compatible token designed to reward members of a team based on both **monetary contributions** and **time-based participation**. This smart contract introduces additional functionality on top of the standard ERC20 to control transferability, restrict token transfers to existing holders if desired, and compute token minting amounts dynamically by weighting time and material contributions.

---

## Table of Contents

- [TeamPoints Contract](#teampoints-contract)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Key Features](#2-key-features)
    - [Transferability Controls](#transferability-controls)
    - [Outside Transfer Restrictions](#outside-transfer-restrictions)
    - [Time-Based Weighting](#time-based-weighting)
    - [Material Contribution Weight](#material-contribution-weight)
    - [Admin Role](#admin-role)
  - [3. Contract Constructor](#3-contract-constructor)
  - [4. Functions](#4-functions)
    - [Mint](#mint)
    - [Update Settings](#update-settings)
    - [Get Time Weight](#get-time-weight)
  - [5. Events](#5-events)
    - [SettingsUpdated](#settingsupdated)
  - [6. Usage](#6-usage)
    - [Deployment](#deployment)
    - [Interacting with the Contract](#interacting-with-the-contract)
    - [Common Scenarios](#common-scenarios)
  - [7. Security Considerations](#7-security-considerations)
  - [8. License](#8-license)

---

## 1. Overview

**TeamPoints (TPNT)** is an ERC20 token that incentivizes both *material* and *time-based* contributions within a team or community. It is ideal for scenarios where you want to:

- Reward members based on monetary or tangible input.  
- Factor in how long members have been contributing or holding tokens.  
- Optionally restrict the transfer of tokens to maintain a closed reward system.  

The contract extends the OpenZeppelin [ERC20](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20) implementation and adds custom functionalities such as **transfer controls**, **time-based weighting** for rewards, and **limited distribution rules**.

---

## 2. Key Features

### Transferability Controls

- **`isTransferable`**: A boolean flag indicating if token transfers are allowed at all.  
  - If `false`, tokens can only move via minting (from `address(0)` to a recipient).  
  - If `true`, tokens can be transferred freely (subject to other restrictions, if any).

### Outside Transfer Restrictions

- **`isOutsideTransferAllowed`**: When `false`, token transfers are only allowed to addresses that are already known token holders.  
  - This helps keep the ecosystem “closed” to only existing members.  
  - If set to `true`, users can transfer tokens to any address.

### Time-Based Weighting

- The function `getTimeWeight(address user)` calculates a time-based weight that scales the user’s mint amount depending on how long they have been holding tokens.  
- Initially, if a user has never received tokens (no first mint time recorded), the weight is **2000**.  
- Every 180 days, the weight increases by **125**, capped at a maximum of **4000**.  

### Material Contribution Weight

- **`materialContributionWeight`**: A multiplier used to scale the monetary portion of the contribution in the minting function.  
- Allows fine-tuning of how heavily “material contributions” factor into token reward calculations relative to time-based contributions.

### Admin Role

- The contract uses a simple admin system controlled by the mapping **`isAdmin`**.  
- **Only admins** are allowed to:
  - Mint new tokens.  
  - Update contract settings such as `isTransferable`, `isOutsideTransferAllowed`, and `materialContributionWeight`.  

---

## 3. Contract Constructor

```solidity
constructor(
    address initialOwner,
    bool _isTransferable,
    bool _isOutsideTransferAllowed,
    uint256 _materialWeight
)
    ERC20("Team Points", "TPNT")
```

**Parameters:**
- `initialOwner`: The address that is granted admin rights upon deployment.  
- `_isTransferable`: Initial setting for whether tokens can be transferred (`true` or `false`).  
- `_isOutsideTransferAllowed`: Initial setting for whether tokens can be transferred to new addresses.  
- `_materialWeight`: Initial setting for the material contribution weight used when minting tokens.  

**Behavior:**
1. Deploys an ERC20 token named **“Team Points”** with symbol **“TPNT”**.  
2. Sets the `initialOwner` as an admin in the `isAdmin` mapping.  
3. Initializes the contract’s configuration settings:
   - `isTransferable`  
   - `isOutsideTransferAllowed`  
   - `materialContributionWeight`  

---

## 4. Functions

### Mint

```solidity
function mint(
    address to,
    uint256 monetaryAmount,
    uint256 timeAmount
) external onlyAdmin
```

**Description:**  
Mints new tokens to a specified address based on both a *material contribution* and a *time-based* contribution.

**Parameters:**
- `to`: The address receiving the newly minted tokens.  
- `monetaryAmount`: The numeric value representing the material (or monetary) contribution.  
- `timeAmount`: The numeric value representing the time-based contribution.  

**Calculation Logic:**
1. If `firstMintTime[to]` is zero, sets it to the current `block.timestamp`.  
2. Calls `getTimeWeight(to)` to fetch the user’s current time weight (between 2000 and 4000).  
3. Computes the total tokens to mint as follows:  
   \[
   \text{totalAmount} = (\text{monetaryAmount} \times \text{materialContributionWeight}) \;+\;
                       \left(\frac{\text{timeAmount} \times \text{timeWeight}}{1000}\right)
   \]
4. Mints `totalAmount` tokens to the `to` address.  
5. Records that the address has received tokens in `hasReceivedTokens[to]`.

**Requirements:**
- Only callable by addresses with `isAdmin[msg.sender] = true`.

---

### Update Settings

```solidity
function updateSettings(
    bool _isTransferable,
    bool _isOutsideTransferAllowed,
    uint256 _materialWeight
) external onlyAdmin
```

**Description:**  
Updates key configuration parameters that control transferability and the weight of material contributions.

**Parameters:**
- `_isTransferable`: Toggles whether tokens can be transferred at all.  
- `_isOutsideTransferAllowed`: Toggles whether tokens can be transferred to new addresses.  
- `_materialWeight`: A multiplier for the material contribution portion of minted tokens.

**Emits:**  
- `SettingsUpdated(bool isTransferable, bool isOutsideTransferAllowed, uint256 materialWeight)`

**Requirements:**
- Only callable by addresses with `isAdmin[msg.sender] = true`.

---

### Get Time Weight

```solidity
function getTimeWeight(address user) public view returns (uint256)
```

**Description:**  
Calculates the time-based weight for an address.

**Logic:**
1. If `firstMintTime[user]` is zero, returns **2000** (the default starting weight).  
2. Otherwise, computes how many 180-day periods have passed since the user’s `firstMintTime`.  
3. Calculates: `timeWeight = 2000 + (sixMonthPeriods * 125)`.  
4. Caps the result at **4000**.  

---

## 5. Events

### SettingsUpdated

```solidity
event SettingsUpdated(bool isTransferable, bool isOutsideTransferAllowed, uint256 materialWeight);
```

**Description:**  
Emitted whenever an admin updates the contract settings via `updateSettings`.

**Parameters:**
- `isTransferable`: The newly set transferability status.  
- `isOutsideTransferAllowed`: The newly set outside transfer allowance status.  
- `materialWeight`: The newly set material contribution weight.

---

## 6. Usage

### Deployment

To deploy the **TeamPoints** contract:

1. Deploy the contract (e.g., using Hardhat, Truffle, or Remix) with the required constructor arguments:  
   ```bash
   constructor(
       address initialOwner,
       bool _isTransferable,
       bool _isOutsideTransferAllowed,
       uint256 _materialWeight
   )
   ```
2. The deployer must specify who the initial admin is (`initialOwner`) and the initial settings.

### Interacting with the Contract

- **Minting**: Call `mint(to, monetaryAmount, timeAmount)` from an admin account to mint new tokens.  
- **Reading Time Weight**: Call `getTimeWeight(user)` to see the multiplier for a user’s time-based contributions.  
- **Updating Settings**: Call `updateSettings(_isTransferable, _isOutsideTransferAllowed, _materialWeight)` from an admin account to change the contract’s configuration.

### Common Scenarios

1. **Grant tokens to a new user**  
   - Ensure `isTransferable` is `false` or `true` based on how you want your system to function.  
   - Use `mint()` to distribute tokens.  
   - The user’s `firstMintTime` is set automatically on first mint, which starts their time-based reward counter.  

2. **Prevent new addresses from receiving tokens**  
   - Set `isOutsideTransferAllowed = false`.  
   - This ensures only addresses that have already received tokens in the past can receive transfers.  

3. **Enable open transfers**  
   - Set `isTransferable = true` and `isOutsideTransferAllowed = true`.  
   - This allows tokens to flow freely to any address.  

4. **Adjust weight of material vs. time contributions**  
   - Adjust `materialContributionWeight` to increase or decrease the importance of monetary contributions.  

---

## 7. Security Considerations

1. **Admin Privileges**  
   - Only addresses flagged as `isAdmin[msg.sender]` can mint tokens or update contract settings.  
   - Ensure you trust the admin(s) to avoid unauthorized token minting or configuration changes.

2. **Transfer Controls**  
   - When `isTransferable` is `false`, standard ERC20 transfers are blocked unless tokens are minted from the zero address.  
   - When `isOutsideTransferAllowed` is `false`, only previously known holders can receive tokens.  

3. **Time Weight Calculation**  
   - `getTimeWeight` depends on the user’s `firstMintTime`. If this timestamp is tampered with (which it can’t be directly by any external function in this contract), it could affect minting.  
   - The function caps the time weight at a maximum of **4000**, preventing unlimited growth.

---

## 8. License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to fork, modify, and use it as needed under the terms of the MIT license.

---

**TeamPoints** is a flexible, extendable contract for building reward systems that balance both material and time-based contributions. By leveraging admin controls, transfer restrictions, and weighted minting, you can create a customized token economy for your team or community.