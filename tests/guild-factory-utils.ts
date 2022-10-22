import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { GuildFactoryOwnershipTransferred } from "../generated/GuildFactory/GuildFactory"

export function createGuildFactoryOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): GuildFactoryOwnershipTransferred {
  let guildFactoryOwnershipTransferredEvent = changetype<
    GuildFactoryOwnershipTransferred
  >(newMockEvent())

  guildFactoryOwnershipTransferredEvent.parameters = new Array()

  guildFactoryOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  guildFactoryOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return guildFactoryOwnershipTransferredEvent
}
