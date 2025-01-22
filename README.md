# Collabberry Smart Contracts

This repository contains two main smart contracts:

1. **TeamPoints** – A specialized ERC20 token that incorporates custom minting logic, transfer restrictions, and role-based access control.
2. **TeamPointsFactory** – A factory contract that deploys new instances of the **TeamPoints** contract.

Below you will find a detailed breakdown of how they work, their functions, and how you might interact with them.

---

## Table of Contents

1. [Overview](#overview)
2. [TeamPoints](#teampoints)
   - [Key Features](#key-features)
   - [Roles & Access Control](#roles--access-control)
   - [State Variables](#state-variables)
   - [Functions](#functions)
   - [Batch Mint](#batch-mint)
3. [TeamPointsFactory](#teampointsfactory)
   - [Factory Logic](#factory-logic)
   - [Functions](#factory-functions)
4. [Usage & Examples](#usage--examples)
5. [Testing](#testing)
6. [Deployed Contracts](#deployed-contracts)
7. [License](#license)

---

## Overview

The **TeamPoints** contract extends the [OpenZeppelin ERC20](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20) and [AccessControl](https://docs.openzeppelin.com/contracts/4.x/access-control) contracts. It introduces the concept of _material_ and _time_ contributions to calculate how many tokens should be minted when an admin calls the `mint` function.

Additionally, **TeamPoints** can:

- Restrict or allow token transfers.
- Enforce that only existing token holders can receive tokens (if desired).
- Limit who can mint tokens using role-based access control.
- Dynamically calculate a “time weight” multiplier that grows over time (up to a cap).

The **TeamPointsFactory** simplifies deploying new **TeamPoints** contracts by providing a single function call that:

- Creates a new **TeamPoints** instance.
- Grants the caller the admin role on that new instance.
- Tracks all the addresses of deployed **TeamPoints** contracts.

---

## TeamPoints

### Key Features

1. **ERC20 with Transfer Controls**  
   The transfer function can be disabled entirely (`isTransferable = false`). Or it can be restricted so that transfers can only happen between existing token holders (`isOutsideTransferAllowed = false`).

2. **Material and Time Contributions**  
   When minting new tokens, the contract calculates the mint amount using:
   ```solidity
   totalAmount = (materialContribution * materialContributionWeight)
               + ((timeContribution * getTimeWeight(user)) / 1000);
   ```
   This way, tokens can reward both tangible (material) and intangible (time-based) contributions, with a user-specific multiplier that increases over time.

3. **Time Weight Calculation**  
   The multiplier for time-based contributions grows every 6 months after a user’s first mint. It starts at 2000 and increases by 125 every 6 months, up to a maximum of 4000.

4. **Access Control**  
   The `ADMIN_ROLE` is required for minting and for adjusting contract settings. Additional admins can be added or removed, but the contract enforces that there must always be at least one admin.

5. **Initial Admin & Ownership**  
   The constructor grants the `ADMIN_ROLE` to an `initialOwner` address. By default, that address can also grant `ADMIN_ROLE` to others.

### Roles & Access Control

- **ADMIN_ROLE** (`bytes32` = `keccak256("ADMIN_ROLE")`)  
  Allows the holder to:
  - Mint new tokens via `mint` 
  - Batch mint tokens via `batchMint`
  - Update critical settings via `updateSettings`.
  - Add or remove admins.

The contract also ensures there is never a scenario where the last admin is removed (which would lock the contract).

### State Variables

- `bool public isTransferable`  
  Determines whether token transfers (beyond minting) are allowed.

- `bool public isOutsideTransferAllowed`  
  If `true`, tokens may be transferred to any address. If `false`, tokens can only be transferred to addresses that already hold tokens.

- `uint256 public materialContributionWeight`  
  The multiplier applied to the `materialContribution` when minting new tokens.

- `uint256 private adminCount`  
  Tracks the number of current admins to prevent removing the last admin.

- `mapping(address => bool) private hasReceivedTokens`  
  Tracks if an address has ever received tokens (either via mint or transfer).

- `mapping(address => uint256) private firstMintTime`  
  Records the block timestamp of the first time an address received tokens.

### Functions

#### Constructor

```solidity
constructor(
    address initialOwner,
    bool _isTransferable,
    bool _isOutsideTransferAllowed,
    uint256 _materialWeight,
    string memory name,
    string memory symbol
) ERC20(name, symbol)
```

- **Parameters**:

  - `initialOwner`: Address to receive the `ADMIN_ROLE`.
  - `_isTransferable`: Initial setting for enabling or disabling transfers.
  - `_isOutsideTransferAllowed`: Initial setting for allowing or disallowing transfers to addresses that do not yet hold tokens.
  - `_materialWeight`: Initial multiplier for material contributions.
  - `name`: ERC20 token name.
  - `symbol`: ERC20 token symbol.

- **Effects**:
  - Grants the `ADMIN_ROLE` to `initialOwner`.
  - Sets `adminCount` to 1.
  - Initializes contract settings with the provided values.

#### `getTimeWeight(address user) -> uint256`

Calculates the time-based multiplier for a given user.  

- **Logic**:
1. If `firstMintTime[user] == 0`, returns `2000` (default).
2. Otherwise, calculates how many 6-month periods have elapsed since `firstMintTime[user]`.
3. Increases the weight by `125` for each 6-month period.
4. Caps the final value at `4000`.

#### `_update(address from, address to, uint256 value) internal override`

Overrides ERC20’s transfer mechanism to enforce the contract’s rules:

- If transfers are disabled (`isTransferable == false`), only allow “mint” transfers (`from == address(0)`).
- If outside transfers are not allowed (`isOutsideTransferAllowed == false`), ensure `to` has received tokens before.

After these checks, calls `super._update(from, to, value)` to finalize the standard ERC20 transfer logic.

#### `mint(address to, uint256 materialContribution, uint256 timeContribution) external onlyRole(ADMIN_ROLE)`

Mints new tokens to a specified address.  
Calculation:

```solidity
uint256 timeWeight = getTimeWeight(to);
uint256 totalAmount = (materialContribution * materialContributionWeight)
                    + ((timeContribution * timeWeight) / 1000);
_mint(to, totalAmount);
```

- If `firstMintTime[to]` is `0`, it is set to the current block timestamp.
- Requires `ADMIN_ROLE`.

#### `updateSettings(bool _isTransferable, bool _isOutsideTransferAllowed, uint256 _materialWeight) external onlyRole(ADMIN_ROLE)`

Updates the contract’s transfer-related settings (`isTransferable`, `isOutsideTransferAllowed`) and the `materialContributionWeight`.

#### `addAdmin(address newAdmin) external onlyRole(ADMIN_ROLE)`

Grants `ADMIN_ROLE` to a new address, provided it already holds some tokens and does not already have `ADMIN_ROLE`.  
Emits an `AdminAdded` event, increments `adminCount`.

#### `removeAdmin(address toRemove) external onlyRole(ADMIN_ROLE)`

Revokes `ADMIN_ROLE` from `toRemove`, provided it currently has `ADMIN_ROLE` and there’s more than one admin remaining.  
Emits an `AdminRemoved` event, decrements `adminCount`.

#### `isAdmin(address account) public view returns (bool)`

Convenience function to check whether a given address has `ADMIN_ROLE`.

---

### Batch Mint

If you need to mint to multiple recipients in a single transaction, you can add a `batchMint()` function to your contract. By default, **TeamPoints** does not include this feature, but you can add something like the following:

```solidity
function batchMint(
    address[] calldata recipients,
    uint256[] calldata materialContributions,
    uint256[] calldata timeContributions
) external onlyRole(ADMIN_ROLE) {
    require(
        recipients.length == materialContributions.length &&
        recipients.length == timeContributions.length,
        "Input array lengths mismatch"
    );

    for (uint256 i = 0; i < recipients.length; i++) {
        if (firstMintTime[recipients[i]] == 0) {
            firstMintTime[recipients[i]] = block.timestamp;
        }

        uint256 timeWeight = getTimeWeight(recipients[i]);
        uint256 totalAmount =
            (materialContributions[i] * materialContributionWeight) +
            ((timeContributions[i] * timeWeight) / 1000);

        _mint(recipients[i], totalAmount);

        if (!hasReceivedTokens[recipients[i]]) {
            hasReceivedTokens[recipients[i]] = true;
        }
    }
}
```

- **Usage**:
  ```js
  // Example (JS / ethers.js):
  await teamPoints.batchMint(
    [user1, user2],
    [100, 200], // material
    [50, 80] // time
  );
  ```
- **Benefits**:
  - All mints occur in a single transaction (atomic).
  - Gas is consolidated into one transaction rather than many.

---

## TeamPointsFactory

### Factory Logic

**TeamPointsFactory** helps you deploy new **TeamPoints** contracts quickly:

- Deploys a new **TeamPoints** instance with desired initial settings.
- Grants the deployer `ADMIN_ROLE` on the new contract.
- Keeps an on-chain record of all deployed contracts.

### Factory Functions

#### `createTeamPoints(...) -> address`

```solidity
function createTeamPoints(
    bool isTransferable,
    bool isOutsideTransferAllowed,
    uint256 materialWeight,
    string memory name,
    string memory symbol
) external returns (address contractAddress)
```

- **Parameters**:

  - `isTransferable`: Whether tokens in the new contract can be transferred.
  - `isOutsideTransferAllowed`: Whether transfers to addresses that haven’t previously held tokens are allowed.
  - `materialWeight`: Initial multiplier for material contributions.
  - `name`: ERC20 name for the new tokens.
  - `symbol`: ERC20 symbol for the new tokens.

- **Effects**:
  - Deploys a new **TeamPoints** instance.
  - Sets `msg.sender` as the initial admin of the new contract.
  - Emits a `TeamPointsCreated` event.

#### `getTeamPointsCount() -> uint256`

Returns the total number of **TeamPoints** contracts deployed.

#### `getAllTeamPoints() -> address[]`

Returns an array of all deployed **TeamPoints** contract addresses.

---

## Usage & Examples

1. **Deploy the Factory**

   ```solidity
   // Deploy the factory
   TeamPointsFactory factory = new TeamPointsFactory();
   ```

2. **Create a TeamPoints Contract**

   ```solidity
   // Create a new TeamPoints contract with the given settings
   address newTeamPointsAddr = factory.createTeamPoints(
       true,     // isTransferable
       false,    // isOutsideTransferAllowed
       100,      // materialContributionWeight
       "My Token",
       "MTK"
   );
   ```

3. **Interact with the Deployed TeamPoints**

   ```solidity
   TeamPoints teamPoints = TeamPoints(newTeamPointsAddr);

   // Check if you're an admin
   bool iAmAdmin = teamPoints.isAdmin(msg.sender);

   // Mint tokens (only if you are an admin)
   if (iAmAdmin) {
       teamPoints.mint(recipientAddress, materialValue, timeValue);
   }
   ```

4. **Update Contract Settings**

   ```solidity
   // As admin, you can update contract settings
   teamPoints.updateSettings(
       true,   // allow transfers
       true,   // allow outside transfers
       200     // new material contribution weight
   );
   ```

5. **Add or Remove Admins**

   ```solidity
   // Mint tokens to a user
   teamPoints.mint(newAdminCandidate, 100, 0);

   // Grant them admin privileges
   teamPoints.addAdmin(newAdminCandidate);

   // Remove an admin
   teamPoints.removeAdmin(currentAdmin);
   ```

6. **Use Batch Mint**  
   If you’ve implemented `batchMint()`, you can mint to multiple addresses in one transaction:
   ```solidity
   // Mint to multiple addresses in one call
   teamPoints.batchMint(
       [user1, user2],
       [10, 20],  // materialContributions
       [50, 100]  // timeContributions
   );
   ```

---

## Testing

A suite of tests (written in JavaScript/TypeScript) is included to demonstrate:

- How to deploy **TeamPointsFactory**.
- How to create a **TeamPoints** instance.
- How to test minting, transfers, time-weight logic, and role-based restrictions.

**Key test scenarios include**:

- Deploying a **TeamPoints** instance and verifying initial settings.
- Minting tokens to users and verifying correct balances.
- Testing the `timeWeight` calculation over multiple 6-month periods.
- Ensuring transfers respect `isTransferable` and `isOutsideTransferAllowed`.
- Adding/removing admins, ensuring the last admin cannot be removed.
- Testing `batchMint()` functionality if you add it to your contract.

You can run the tests by:

```bash
npx hardhat test
```

---

## Deployed Contracts

- **Network**: Arbitrum Sepolia
- **Environment used**: https://app.collabberry.xyz (Dev)
- **TeamPointsFactory** deployed to: `0x0e414560fdEeC039c4636b9392176ddc938b182D`


- **Network**: Arbitrum One
- **Environment used**: https://beta.collabberry.xyz (Beta)
- **TeamPointsFactory** deployed to: `0x69a99AeAc1F2410e82A84E08268b336116Ab3B5a`

---

## License

Both **TeamPoints** and **TeamPointsFactory** are licensed under the MIT License. See the [LICENSE](https://opensource.org/licenses/MIT) file for more details.
