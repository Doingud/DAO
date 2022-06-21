pragma solidity 0.8.14;

contract AMORDataStorage {

    error Unauthorized();
    event TaxManagerChanged(address _newTaxManager);

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address private taxCollector;
    uint256 private taxRate;
    uint256 private totalSupply;

    address public owner;
    address public taxManager; // AMOR contract

    constructor() public {
        owner = msg.sender;
        taxManager = msg.sender;
    }

    modifier onlyAddress(address authorizedAddress) {
        if (msg.sender != authorizedAddress) {
            revert Unauthorized();
        }
        _;
    }  

    function setTaxManager(address _taxM) external onlyAddress(owner) { //not AMOR but owner, because if we updating AMOR proxy we also need to update taxManager
        taxManager = _taxM;
        emit TaxManagerChanged(_taxM);
    }

    function getTaxCollector() public view returns (address) {
        return taxCollector;
    }

    function getTaxRate() public view returns (uint256) {
        return taxRate;
    }

    function setTaxRate(uint256 _taxRate) onlyAddress(taxManager) public {
        taxRate = _taxRate;
    }

    function setTaxCollector(address _taxCollector) onlyAddress(taxManager) public {
        taxCollector = _taxCollector;
    }

}
