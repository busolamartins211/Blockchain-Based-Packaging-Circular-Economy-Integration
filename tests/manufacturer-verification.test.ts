import { describe, it, expect, beforeEach } from "vitest"

describe("Manufacturer Verification Contract", () => {
  let contractState
  
  beforeEach(() => {
    // Reset contract state for each test
    contractState = {
      manufacturers: new Map(),
      totalManufacturers: 0,
      contractOwner: "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX17ECNP",
    }
  })
  
  describe("register-manufacturer", () => {
    it("should register a new manufacturer successfully", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      const name = "EcoPackaging Inc"
      const materials = ["cardboard", "biodegradable-plastic"]
      
      const result = registerManufacturer(contractState, manufacturerId, name, materials)
      
      expect(result.success).toBe(true)
      expect(result.value).toBe(manufacturerId)
      expect(contractState.manufacturers.has(manufacturerId)).toBe(true)
      expect(contractState.totalManufacturers).toBe(1)
      
      const manufacturer = contractState.manufacturers.get(manufacturerId)
      expect(manufacturer.name).toBe(name)
      expect(manufacturer.status).toBe(0) // STATUS_PENDING
      expect(manufacturer.materialsProduced).toEqual(materials)
    })
    
    it("should fail when manufacturer already exists", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      const name = "EcoPackaging Inc"
      const materials = ["cardboard"]
      
      // Register first time
      registerManufacturer(contractState, manufacturerId, name, materials)
      
      // Try to register again
      const result = registerManufacturer(contractState, manufacturerId, name, materials)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(101) // ERR_MANUFACTURER_EXISTS
    })
    
    it("should fail when called by non-owner", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      const name = "EcoPackaging Inc"
      const materials = ["cardboard"]
      const nonOwner = "SP3NOTOWNER456"
      
      const result = registerManufacturer(contractState, manufacturerId, name, materials, nonOwner)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(100) // ERR_UNAUTHORIZED
    })
  })
  
  describe("verify-manufacturer", () => {
    beforeEach(() => {
      // Register a manufacturer first
      registerManufacturer(contractState, "SP2MANUFACTURER123", "EcoPackaging Inc", ["cardboard"])
    })
    
    it("should verify manufacturer successfully", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      const certificationLevel = 3
      const sustainabilityScore = 85
      
      const result = verifyManufacturer(contractState, manufacturerId, certificationLevel, sustainabilityScore)
      
      expect(result.success).toBe(true)
      
      const manufacturer = contractState.manufacturers.get(manufacturerId)
      expect(manufacturer.status).toBe(1) // STATUS_VERIFIED
      expect(manufacturer.certificationLevel).toBe(certificationLevel)
      expect(manufacturer.sustainabilityScore).toBe(sustainabilityScore)
      expect(manufacturer.verifiedAt).toBeGreaterThan(0)
    })
    
    it("should fail when manufacturer not found", () => {
      const result = verifyManufacturer(contractState, "SP2NONEXISTENT", 3, 85)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(102) // ERR_MANUFACTURER_NOT_FOUND
    })
  })
  
  describe("get-manufacturer", () => {
    it("should return manufacturer details when exists", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      registerManufacturer(contractState, manufacturerId, "EcoPackaging Inc", ["cardboard"])
      
      const result = getManufacturer(contractState, manufacturerId)
      
      expect(result).toBeDefined()
      expect(result.name).toBe("EcoPackaging Inc")
      expect(result.materialsProduced).toContain("cardboard")
    })
    
    it("should return undefined when manufacturer does not exist", () => {
      const result = getManufacturer(contractState, "SP2NONEXISTENT")
      
      expect(result).toBeUndefined()
    })
  })
  
  describe("is-verified", () => {
    it("should return true for verified manufacturer", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      registerManufacturer(contractState, manufacturerId, "EcoPackaging Inc", ["cardboard"])
      verifyManufacturer(contractState, manufacturerId, 3, 85)
      
      const result = isVerified(contractState, manufacturerId)
      
      expect(result).toBe(true)
    })
    
    it("should return false for unverified manufacturer", () => {
      const manufacturerId = "SP2MANUFACTURER123"
      registerManufacturer(contractState, manufacturerId, "EcoPackaging Inc", ["cardboard"])
      
      const result = isVerified(contractState, manufacturerId)
      
      expect(result).toBe(false)
    })
    
    it("should return false for non-existent manufacturer", () => {
      const result = isVerified(contractState, "SP2NONEXISTENT")
      
      expect(result).toBe(false)
    })
  })
})

// Helper functions to simulate contract behavior
function registerManufacturer(state, manufacturerId, name, materials, caller = state.contractOwner) {
  if (caller !== state.contractOwner) {
    return { success: false, error: 100 }
  }
  
  if (state.manufacturers.has(manufacturerId)) {
    return { success: false, error: 101 }
  }
  
  state.manufacturers.set(manufacturerId, {
    name,
    certificationLevel: 1,
    sustainabilityScore: 50,
    status: 0, // STATUS_PENDING
    verifiedAt: 0,
    materialsProduced: materials,
  })
  
  state.totalManufacturers += 1
  return { success: true, value: manufacturerId }
}

function verifyManufacturer(
    state,
    manufacturerId,
    certificationLevel,
    sustainabilityScore,
    caller = state.contractOwner,
) {
  if (caller !== state.contractOwner) {
    return { success: false, error: 100 }
  }
  
  if (!state.manufacturers.has(manufacturerId)) {
    return { success: false, error: 102 }
  }
  
  const manufacturer = state.manufacturers.get(manufacturerId)
  state.manufacturers.set(manufacturerId, {
    ...manufacturer,
    certificationLevel,
    sustainabilityScore,
    status: 1, // STATUS_VERIFIED
    verifiedAt: Date.now(),
  })
  
  return { success: true, value: true }
}

function getManufacturer(state, manufacturerId) {
  return state.manufacturers.get(manufacturerId)
}

function isVerified(state, manufacturerId) {
  const manufacturer = state.manufacturers.get(manufacturerId)
  return manufacturer ? manufacturer.status === 1 : false
}
