import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import {
  DisabledModule,
  EnabledModule,
  ExecutionFromGovernorFailure,
  ExecutionFromGovernorSuccess,
  ExecutionFromModuleFailure,
  ExecutionFromModuleSuccess,
  Initialized
} from "../generated/Avatar/Avatar"

export function createDisabledModuleEvent(module: Address): DisabledModule {
  let disabledModuleEvent = changetype<DisabledModule>(newMockEvent())

  disabledModuleEvent.parameters = new Array()

  disabledModuleEvent.parameters.push(
    new ethereum.EventParam("module", ethereum.Value.fromAddress(module))
  )

  return disabledModuleEvent
}

export function createEnabledModuleEvent(module: Address): EnabledModule {
  let enabledModuleEvent = changetype<EnabledModule>(newMockEvent())

  enabledModuleEvent.parameters = new Array()

  enabledModuleEvent.parameters.push(
    new ethereum.EventParam("module", ethereum.Value.fromAddress(module))
  )

  return enabledModuleEvent
}

export function createExecutionFromGovernorFailureEvent(
  governorAddress: Address
): ExecutionFromGovernorFailure {
  let executionFromGovernorFailureEvent = changetype<
    ExecutionFromGovernorFailure
  >(newMockEvent())

  executionFromGovernorFailureEvent.parameters = new Array()

  executionFromGovernorFailureEvent.parameters.push(
    new ethereum.EventParam(
      "governorAddress",
      ethereum.Value.fromAddress(governorAddress)
    )
  )

  return executionFromGovernorFailureEvent
}

export function createExecutionFromGovernorSuccessEvent(
  governorAddress: Address
): ExecutionFromGovernorSuccess {
  let executionFromGovernorSuccessEvent = changetype<
    ExecutionFromGovernorSuccess
  >(newMockEvent())

  executionFromGovernorSuccessEvent.parameters = new Array()

  executionFromGovernorSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "governorAddress",
      ethereum.Value.fromAddress(governorAddress)
    )
  )

  return executionFromGovernorSuccessEvent
}

export function createExecutionFromModuleFailureEvent(
  module: Address
): ExecutionFromModuleFailure {
  let executionFromModuleFailureEvent = changetype<ExecutionFromModuleFailure>(
    newMockEvent()
  )

  executionFromModuleFailureEvent.parameters = new Array()

  executionFromModuleFailureEvent.parameters.push(
    new ethereum.EventParam("module", ethereum.Value.fromAddress(module))
  )

  return executionFromModuleFailureEvent
}

export function createExecutionFromModuleSuccessEvent(
  module: Address
): ExecutionFromModuleSuccess {
  let executionFromModuleSuccessEvent = changetype<ExecutionFromModuleSuccess>(
    newMockEvent()
  )

  executionFromModuleSuccessEvent.parameters = new Array()

  executionFromModuleSuccessEvent.parameters.push(
    new ethereum.EventParam("module", ethereum.Value.fromAddress(module))
  )

  return executionFromModuleSuccessEvent
}

export function createInitializedEvent(
  success: boolean,
  owner: Address,
  governorAddress: Address
): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam("success", ethereum.Value.fromBoolean(success))
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "governorAddress",
      ethereum.Value.fromAddress(governorAddress)
    )
  )

  return initializedEvent
}
