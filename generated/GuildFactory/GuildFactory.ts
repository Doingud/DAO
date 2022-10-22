// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class GuildFactoryOwnershipTransferred extends ethereum.Event {
  get params(): GuildFactoryOwnershipTransferred__Params {
    return new GuildFactoryOwnershipTransferred__Params(this);
  }
}

export class GuildFactoryOwnershipTransferred__Params {
  _event: GuildFactoryOwnershipTransferred;

  constructor(event: GuildFactoryOwnershipTransferred) {
    this._event = event;
  }

  get previousOwner(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get newOwner(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class GuildFactory__deployGuildContractsResult {
  value0: Address;
  value1: Address;
  value2: Address;

  constructor(value0: Address, value1: Address, value2: Address) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
  }

  toMap(): TypedMap<string, ethereum.Value> {
    let map = new TypedMap<string, ethereum.Value>();
    map.set("value0", ethereum.Value.fromAddress(this.value0));
    map.set("value1", ethereum.Value.fromAddress(this.value1));
    map.set("value2", ethereum.Value.fromAddress(this.value2));
    return map;
  }

  getController(): Address {
    return this.value0;
  }

  getAvatar(): Address {
    return this.value1;
  }

  getGovernor(): Address {
    return this.value2;
  }
}

export class GuildFactory__guildsResult {
  value0: Address;
  value1: Address;
  value2: Address;
  value3: Address;
  value4: Address;

  constructor(
    value0: Address,
    value1: Address,
    value2: Address,
    value3: Address,
    value4: Address
  ) {
    this.value0 = value0;
    this.value1 = value1;
    this.value2 = value2;
    this.value3 = value3;
    this.value4 = value4;
  }

  toMap(): TypedMap<string, ethereum.Value> {
    let map = new TypedMap<string, ethereum.Value>();
    map.set("value0", ethereum.Value.fromAddress(this.value0));
    map.set("value1", ethereum.Value.fromAddress(this.value1));
    map.set("value2", ethereum.Value.fromAddress(this.value2));
    map.set("value3", ethereum.Value.fromAddress(this.value3));
    map.set("value4", ethereum.Value.fromAddress(this.value4));
    return map;
  }

  getAmorGuildToken(): Address {
    return this.value0;
  }

  getDAmorxGuild(): Address {
    return this.value1;
  }

  getFXAmorxGuild(): Address {
    return this.value2;
  }

  getAvatarxGuild(): Address {
    return this.value3;
  }

  getGovernorxGuild(): Address {
    return this.value4;
  }
}

export class GuildFactory extends ethereum.SmartContract {
  static bind(address: Address): GuildFactory {
    return new GuildFactory("GuildFactory", address);
  }

  DEFAULT_GUARDIAN_THRESHOLD(): BigInt {
    let result = super.call(
      "DEFAULT_GUARDIAN_THRESHOLD",
      "DEFAULT_GUARDIAN_THRESHOLD():(uint256)",
      []
    );

    return result[0].toBigInt();
  }

  try_DEFAULT_GUARDIAN_THRESHOLD(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "DEFAULT_GUARDIAN_THRESHOLD",
      "DEFAULT_GUARDIAN_THRESHOLD():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  amorToken(): Address {
    let result = super.call("amorToken", "amorToken():(address)", []);

    return result[0].toAddress();
  }

  try_amorToken(): ethereum.CallResult<Address> {
    let result = super.tryCall("amorToken", "amorToken():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  amorxGuildToken(): Address {
    let result = super.call(
      "amorxGuildToken",
      "amorxGuildToken():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_amorxGuildToken(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "amorxGuildToken",
      "amorxGuildToken():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  avatarxGuild(): Address {
    let result = super.call("avatarxGuild", "avatarxGuild():(address)", []);

    return result[0].toAddress();
  }

  try_avatarxGuild(): ethereum.CallResult<Address> {
    let result = super.tryCall("avatarxGuild", "avatarxGuild():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  cloneTarget(): Address {
    let result = super.call("cloneTarget", "cloneTarget():(address)", []);

    return result[0].toAddress();
  }

  try_cloneTarget(): ethereum.CallResult<Address> {
    let result = super.tryCall("cloneTarget", "cloneTarget():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  controllerxGuild(): Address {
    let result = super.call(
      "controllerxGuild",
      "controllerxGuild():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_controllerxGuild(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "controllerxGuild",
      "controllerxGuild():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  dAmorxGuild(): Address {
    let result = super.call("dAmorxGuild", "dAmorxGuild():(address)", []);

    return result[0].toAddress();
  }

  try_dAmorxGuild(): ethereum.CallResult<Address> {
    let result = super.tryCall("dAmorxGuild", "dAmorxGuild():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  deployGuildContracts(
    guildOwner: Address,
    _name: string,
    _symbol: string
  ): GuildFactory__deployGuildContractsResult {
    let result = super.call(
      "deployGuildContracts",
      "deployGuildContracts(address,string,string):(address,address,address)",
      [
        ethereum.Value.fromAddress(guildOwner),
        ethereum.Value.fromString(_name),
        ethereum.Value.fromString(_symbol)
      ]
    );

    return new GuildFactory__deployGuildContractsResult(
      result[0].toAddress(),
      result[1].toAddress(),
      result[2].toAddress()
    );
  }

  try_deployGuildContracts(
    guildOwner: Address,
    _name: string,
    _symbol: string
  ): ethereum.CallResult<GuildFactory__deployGuildContractsResult> {
    let result = super.tryCall(
      "deployGuildContracts",
      "deployGuildContracts(address,string,string):(address,address,address)",
      [
        ethereum.Value.fromAddress(guildOwner),
        ethereum.Value.fromString(_name),
        ethereum.Value.fromString(_symbol)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(
      new GuildFactory__deployGuildContractsResult(
        value[0].toAddress(),
        value[1].toAddress(),
        value[2].toAddress()
      )
    );
  }

  fXAmorxGuild(): Address {
    let result = super.call("fXAmorxGuild", "fXAmorxGuild():(address)", []);

    return result[0].toAddress();
  }

  try_fXAmorxGuild(): ethereum.CallResult<Address> {
    let result = super.tryCall("fXAmorxGuild", "fXAmorxGuild():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  governorxGuild(): Address {
    let result = super.call("governorxGuild", "governorxGuild():(address)", []);

    return result[0].toAddress();
  }

  try_governorxGuild(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "governorxGuild",
      "governorxGuild():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  guilds(param0: Address): GuildFactory__guildsResult {
    let result = super.call(
      "guilds",
      "guilds(address):(address,address,address,address,address)",
      [ethereum.Value.fromAddress(param0)]
    );

    return new GuildFactory__guildsResult(
      result[0].toAddress(),
      result[1].toAddress(),
      result[2].toAddress(),
      result[3].toAddress(),
      result[4].toAddress()
    );
  }

  try_guilds(param0: Address): ethereum.CallResult<GuildFactory__guildsResult> {
    let result = super.tryCall(
      "guilds",
      "guilds(address):(address,address,address,address,address)",
      [ethereum.Value.fromAddress(param0)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(
      new GuildFactory__guildsResult(
        value[0].toAddress(),
        value[1].toAddress(),
        value[2].toAddress(),
        value[3].toAddress(),
        value[4].toAddress()
      )
    );
  }

  metaDaoController(): Address {
    let result = super.call(
      "metaDaoController",
      "metaDaoController():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_metaDaoController(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "metaDaoController",
      "metaDaoController():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  owner(): Address {
    let result = super.call("owner", "owner():(address)", []);

    return result[0].toAddress();
  }

  try_owner(): ethereum.CallResult<Address> {
    let result = super.tryCall("owner", "owner():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  snapshot(): Address {
    let result = super.call("snapshot", "snapshot():(address)", []);

    return result[0].toAddress();
  }

  try_snapshot(): ethereum.CallResult<Address> {
    let result = super.tryCall("snapshot", "snapshot():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _amorToken(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _amorxGuildToken(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get _fxAMORxGuildToken(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get _dAMORxGuildToken(): Address {
    return this._call.inputValues[3].value.toAddress();
  }

  get _doinGudProxy(): Address {
    return this._call.inputValues[4].value.toAddress();
  }

  get _controllerxGuild(): Address {
    return this._call.inputValues[5].value.toAddress();
  }

  get _governor(): Address {
    return this._call.inputValues[6].value.toAddress();
  }

  get _avatarxGuild(): Address {
    return this._call.inputValues[7].value.toAddress();
  }

  get _metaDaoController(): Address {
    return this._call.inputValues[8].value.toAddress();
  }

  get _snapshot(): Address {
    return this._call.inputValues[9].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class DeployGuildContractsCall extends ethereum.Call {
  get inputs(): DeployGuildContractsCall__Inputs {
    return new DeployGuildContractsCall__Inputs(this);
  }

  get outputs(): DeployGuildContractsCall__Outputs {
    return new DeployGuildContractsCall__Outputs(this);
  }
}

export class DeployGuildContractsCall__Inputs {
  _call: DeployGuildContractsCall;

  constructor(call: DeployGuildContractsCall) {
    this._call = call;
  }

  get guildOwner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _name(): string {
    return this._call.inputValues[1].value.toString();
  }

  get _symbol(): string {
    return this._call.inputValues[2].value.toString();
  }
}

export class DeployGuildContractsCall__Outputs {
  _call: DeployGuildContractsCall;

  constructor(call: DeployGuildContractsCall) {
    this._call = call;
  }

  get controller(): Address {
    return this._call.outputValues[0].value.toAddress();
  }

  get avatar(): Address {
    return this._call.outputValues[1].value.toAddress();
  }

  get governor(): Address {
    return this._call.outputValues[2].value.toAddress();
  }
}

export class RenounceOwnershipCall extends ethereum.Call {
  get inputs(): RenounceOwnershipCall__Inputs {
    return new RenounceOwnershipCall__Inputs(this);
  }

  get outputs(): RenounceOwnershipCall__Outputs {
    return new RenounceOwnershipCall__Outputs(this);
  }
}

export class RenounceOwnershipCall__Inputs {
  _call: RenounceOwnershipCall;

  constructor(call: RenounceOwnershipCall) {
    this._call = call;
  }
}

export class RenounceOwnershipCall__Outputs {
  _call: RenounceOwnershipCall;

  constructor(call: RenounceOwnershipCall) {
    this._call = call;
  }
}

export class TransferOwnershipCall extends ethereum.Call {
  get inputs(): TransferOwnershipCall__Inputs {
    return new TransferOwnershipCall__Inputs(this);
  }

  get outputs(): TransferOwnershipCall__Outputs {
    return new TransferOwnershipCall__Outputs(this);
  }
}

export class TransferOwnershipCall__Inputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }

  get newOwner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class TransferOwnershipCall__Outputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }
}
