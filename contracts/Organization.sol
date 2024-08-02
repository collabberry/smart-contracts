// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TeamPoints.sol";

contract Organization is Ownable {
    mapping(address => bool) private members;
    TeamPoints public teamPoints;
    string public metadata;

    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);

    constructor(address _owner, string memory _metadata) Ownable(_owner) {
        metadata = _metadata;

        members[_owner] = true;
        emit MemberAdded(_owner);

        teamPoints = new TeamPoints(address(this), _owner);
    }

    function addMember(address _member) external onlyOwner {
        require(!members[_member], "Member already exists");
        members[_member] = true;
        emit MemberAdded(_member);
    }

    function removeMember(address _member) external onlyOwner {
        require(members[_member], "Member does not exist");
        members[_member] = false;
        emit MemberRemoved(_member);
    }

    function isMember(address _member) external view returns (bool) {
        return members[_member];
    }
}
