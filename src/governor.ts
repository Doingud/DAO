import {
  ChangedGuardiansLimit as ChangedGuardiansLimitEvent,
  GovernorInitialized as GovernorInitializedEvent,
  ProposalCanceled as ProposalCanceledEvent,
  ProposalCreated as ProposalCreatedEvent,
  ProposalExecuted as ProposalExecutedEvent
} from "../generated/Governor/Governor"
import {
  ChangedGuardiansLimit,
  GovernorInitialized,
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted
} from "../generated/schema"

export function handleChangedGuardiansLimit(
  event: ChangedGuardiansLimitEvent
): void {
  let entity = new ChangedGuardiansLimit(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.newLimit = event.params.newLimit
  entity.save()
}

export function handleGovernorInitialized(
  event: GovernorInitializedEvent
): void {
  let entity = new GovernorInitialized(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.success = event.params.success
  entity.avatarAddress = event.params.avatarAddress
  entity.snapshotAddress = event.params.snapshotAddress
  entity.save()
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let entity = new ProposalCanceled(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.save()
}

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let entity = new ProposalCreated(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.proposer = event.params.proposer
  entity.targets = event.params.targets
  entity.values = event.params.values
  entity.calldatas = event.params.calldatas
  entity.startBlock = event.params.startBlock
  entity.endBlock = event.params.endBlock
  entity.save()
}

export function handleProposalExecuted(event: ProposalExecutedEvent): void {
  let entity = new ProposalExecuted(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.proposalId = event.params.proposalId
  entity.save()
}
