import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import { ChangedGuardiansLimit } from "../generated/schema"
import { ChangedGuardiansLimit as ChangedGuardiansLimitEvent } from "../generated/Governor/Governor"
import { handleChangedGuardiansLimit } from "../src/governor"
import { createChangedGuardiansLimitEvent } from "./governor-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let newLimit = BigInt.fromI32(234)
    let newChangedGuardiansLimitEvent = createChangedGuardiansLimitEvent(
      newLimit
    )
    handleChangedGuardiansLimit(newChangedGuardiansLimitEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ChangedGuardiansLimit created and stored", () => {
    assert.entityCount("ChangedGuardiansLimit", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ChangedGuardiansLimit",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newLimit",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
