import { GuildFactoryOwnershipTransferred as GuildFactoryOwnershipTransferredEvent } from "../generated/GuildFactory/GuildFactory"
import { GuildFactoryOwnershipTransferred } from "../generated/schema"

export function handleGuildFactoryOwnershipTransferred(
  event: GuildFactoryOwnershipTransferredEvent
): void {
  let entity = new GuildFactoryOwnershipTransferred(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  entity.save()
}
