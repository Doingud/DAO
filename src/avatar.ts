import {
  DisabledModule as DisabledModuleEvent,
  EnabledModule as EnabledModuleEvent,
  ExecutionFromGovernorFailure as ExecutionFromGovernorFailureEvent,
  ExecutionFromGovernorSuccess as ExecutionFromGovernorSuccessEvent,
  ExecutionFromModuleFailure as ExecutionFromModuleFailureEvent,
  ExecutionFromModuleSuccess as ExecutionFromModuleSuccessEvent,
  Initialized as InitializedEvent
} from "../generated/Avatar/Avatar"
import {
  DisabledModule,
  EnabledModule,
  ExecutionFromGovernorFailure,
  ExecutionFromGovernorSuccess,
  ExecutionFromModuleFailure,
  ExecutionFromModuleSuccess,
  Initialized
} from "../generated/schema"

export function handleDisabledModule(event: DisabledModuleEvent): void {
  let entity = new DisabledModule(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.module = event.params.module
  entity.save()
}

export function handleEnabledModule(event: EnabledModuleEvent): void {
  let entity = new EnabledModule(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.module = event.params.module
  entity.save()
}

export function handleExecutionFromGovernorFailure(
  event: ExecutionFromGovernorFailureEvent
): void {
  let entity = new ExecutionFromGovernorFailure(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.governorAddress = event.params.governorAddress
  entity.save()
}

export function handleExecutionFromGovernorSuccess(
  event: ExecutionFromGovernorSuccessEvent
): void {
  let entity = new ExecutionFromGovernorSuccess(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.governorAddress = event.params.governorAddress
  entity.save()
}

export function handleExecutionFromModuleFailure(
  event: ExecutionFromModuleFailureEvent
): void {
  let entity = new ExecutionFromModuleFailure(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.module = event.params.module
  entity.save()
}

export function handleExecutionFromModuleSuccess(
  event: ExecutionFromModuleSuccessEvent
): void {
  let entity = new ExecutionFromModuleSuccess(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.module = event.params.module
  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.success = event.params.success
  entity.owner = event.params.owner
  entity.governorAddress = event.params.governorAddress
  entity.save()
}
