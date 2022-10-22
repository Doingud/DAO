import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  ChangedGuardiansLimit,
  GovernorInitialized,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted
} from "../generated/Governor/Governor"

export function createChangedGuardiansLimitEvent(
  newLimit: BigInt
): ChangedGuardiansLimit {
  let changedGuardiansLimitEvent = changetype<ChangedGuardiansLimit>(
    newMockEvent()
  )

  changedGuardiansLimitEvent.parameters = new Array()

  changedGuardiansLimitEvent.parameters.push(
    new ethereum.EventParam(
      "newLimit",
      ethereum.Value.fromUnsignedBigInt(newLimit)
    )
  )

  return changedGuardiansLimitEvent
}

export function createGovernorInitializedEvent(
  success: boolean,
  avatarAddress: Address,
  snapshotAddress: Address
): GovernorInitialized {
  let governorInitializedEvent = changetype<GovernorInitialized>(newMockEvent())

  governorInitializedEvent.parameters = new Array()

  governorInitializedEvent.parameters.push(
    new ethereum.EventParam("success", ethereum.Value.fromBoolean(success))
  )
  governorInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "avatarAddress",
      ethereum.Value.fromAddress(avatarAddress)
    )
  )
  governorInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "snapshotAddress",
      ethereum.Value.fromAddress(snapshotAddress)
    )
  )

  return governorInitializedEvent
}

export function createProposalCanceledEvent(
  proposalId: BigInt
): ProposalCanceled {
  let proposalCanceledEvent = changetype<ProposalCanceled>(newMockEvent())

  proposalCanceledEvent.parameters = new Array()

  proposalCanceledEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )

  return proposalCanceledEvent
}

export function createProposalCreatedEvent(
  proposalId: BigInt,
  proposer: Address,
  targets: Array<Address>,
  values: Array<BigInt>,
  calldatas: Array<Bytes>,
  startBlock: BigInt,
  endBlock: BigInt
): ProposalCreated {
  let proposalCreatedEvent = changetype<ProposalCreated>(newMockEvent())

  proposalCreatedEvent.parameters = new Array()

  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam("proposer", ethereum.Value.fromAddress(proposer))
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam("targets", ethereum.Value.fromAddressArray(targets))
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "values",
      ethereum.Value.fromUnsignedBigIntArray(values)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "calldatas",
      ethereum.Value.fromBytesArray(calldatas)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startBlock",
      ethereum.Value.fromUnsignedBigInt(startBlock)
    )
  )
  proposalCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "endBlock",
      ethereum.Value.fromUnsignedBigInt(endBlock)
    )
  )

  return proposalCreatedEvent
}

export function createProposalExecutedEvent(
  proposalId: BigInt
): ProposalExecuted {
  let proposalExecutedEvent = changetype<ProposalExecuted>(newMockEvent())

  proposalExecutedEvent.parameters = new Array()

  proposalExecutedEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )

  return proposalExecutedEvent
}
