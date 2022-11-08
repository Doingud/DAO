pragma solidity ^0.8.0;

library UintUtils {
    /// @dev Gas optimization for loops that iterate over extra rewards
    /// We know that this can't overflow because we can't interate over big arrays
    function unsafeIncr(uint256 x) internal pure returns (uint256) {
        unchecked {
            return x + 1;
        }
    }
}
