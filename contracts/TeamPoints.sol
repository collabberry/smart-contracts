// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract TeamPoints is ERC20, AccessControl {
    /**
     * @dev We define a constant for the admin role. By default, AccessControl
     * gives us `DEFAULT_ADMIN_ROLE`, but you can define a custom role name if you prefer.
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    bool public isTransferable;
    bool public isOutsideTransferAllowed;
    uint256 public materialContributionWeight;

    // Keep track of how many accounts have the ADMIN_ROLE
    uint256 private adminCount;

    mapping(address => bool) private hasReceivedTokens;
    mapping(address => uint256) private firstMintTime;

    event SettingsUpdated(
        bool isTransferable,
        bool isOutsideTransferAllowed,
        uint256 materialWeight
    );
    event AdminAdded(address newAdmin);
    event AdminRemoved(address removedAdmin);

    constructor(
        address initialOwner,
        bool _isTransferable,
        bool _isOutsideTransferAllowed,
        uint256 _materialWeight,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        // Also grant the DEFAULT_ADMIN_ROLE if you want the same address
        // to have permission to grant/revoke ADMIN_ROLE itself.
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _grantRole(ADMIN_ROLE, initialOwner);

        adminCount = 1;

        isTransferable = _isTransferable;
        isOutsideTransferAllowed = _isOutsideTransferAllowed;
        materialContributionWeight = _materialWeight;
    }

    // ------------------------------------------------------------------------
    // Main Logic
    // ------------------------------------------------------------------------

    function getTimeWeight(address user) public view returns (uint256) {
        if (firstMintTime[user] == 0) return 2000;

        uint256 sixMonthPeriods = (block.timestamp - firstMintTime[user]) /
            (180 days);
        uint256 timeWeight = 2000 + (sixMonthPeriods * 125);

        return timeWeight > 4000 ? 4000 : timeWeight;
    }

    /**
     * @dev Override the ERC20 transfer function to enforce custom logic.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        require(isTransferable || from == address(0), "Transfers are disabled");

        if (!isOutsideTransferAllowed && from != address(0)) {
            require(
                hasReceivedTokens[to],
                "Recipient must be an existing token holder"
            );
        }

        super._update(from, to, value);
    }

    /**
     * @dev Mint function restricted to ADMIN_ROLE.
     * The minted amount is calculated using your material/time logic.
     */
    function mint(
        address to,
        uint256 materialContribution,
        uint256 timeContribution
    ) external onlyRole(ADMIN_ROLE) {
        if (firstMintTime[to] == 0) {
            firstMintTime[to] = block.timestamp;
        }

        uint256 timeWeight = getTimeWeight(to);
        uint256 totalAmount = ((materialContribution * materialContributionWeight) /
            1000) + ((timeContribution * timeWeight) / 1000);

        _mint(to, totalAmount);

        if (!hasReceivedTokens[to]) {
            hasReceivedTokens[to] = true;
        }
    }

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
            // If first time minting for this recipient, set their firstMintTime
            if (firstMintTime[recipients[i]] == 0) {
                firstMintTime[recipients[i]] = block.timestamp;
            }

            uint256 timeWeight = getTimeWeight(recipients[i]);

            // Same mint calculation as in your existing mint function
            uint256 totalAmount = ((materialContributions[i] *
                materialContributionWeight) / 1000) +
                ((timeContributions[i] * timeWeight) / 1000);

            _mint(recipients[i], totalAmount);

            // Mark that this recipient has received tokens
            if (!hasReceivedTokens[recipients[i]]) {
                hasReceivedTokens[recipients[i]] = true;
            }
        }
    }

    /**
     * @dev Admin can update settings controlling transfer behavior and materialWeight.
     */
    function updateSettings(
        bool _isTransferable,
        bool _isOutsideTransferAllowed,
        uint256 _materialWeight
    ) external onlyRole(ADMIN_ROLE) {
        isTransferable = _isTransferable;
        isOutsideTransferAllowed = _isOutsideTransferAllowed;
        materialContributionWeight = _materialWeight;

        emit SettingsUpdated(
            _isTransferable,
            _isOutsideTransferAllowed,
            _materialWeight
        );
    }

    // ------------------------------------------------------------------------
    // Access Control Overrides
    // ------------------------------------------------------------------------

    /**
     * @dev Add a new admin. We enforce that the new admin must already be a token holder
     */
    function addAdmin(address newAdmin) external onlyRole(ADMIN_ROLE) {
        require(
            hasReceivedTokens[newAdmin],
            "New admin must be a token holder"
        );
        // Only grant if they don't already have the role
        if (!hasRole(ADMIN_ROLE, newAdmin)) {
            _grantRole(ADMIN_ROLE, newAdmin);
            adminCount++;
            emit AdminAdded(newAdmin);
        }
    }

    /**
     * @dev Remove an existing admin. We ensure we never remove the last admin.
     */
    function removeAdmin(address toRemove) external onlyRole(ADMIN_ROLE) {
        require(
            hasRole(ADMIN_ROLE, toRemove),
            "Address is not currently an admin"
        );
        require(
            adminCount > 1,
            "Cannot remove the last admin - it would lock the contract"
        );

        _revokeRole(ADMIN_ROLE, toRemove);
        adminCount--;
        emit AdminRemoved(toRemove);
    }

    function isAdmin(address account) public view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }
}
