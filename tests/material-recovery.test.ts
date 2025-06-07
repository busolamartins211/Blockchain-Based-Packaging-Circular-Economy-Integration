import { describe, it, expect, beforeEach } from "vitest"

describe("Material Recovery Contract", () => {
  let contractState
  
  beforeEach(() => {
    contractState = {
      recoveryRecords: new Map(),
      materialInventory: new Map(),
      totalRecoveryEvents: 0,
    }
  })
  
  describe("record-recovery", () => {
    it("should record material recovery successfully", () => {
      const packageId = "PKG-001-2024"
      const manufacturer = "SP2MANUFACTURER123"
      const materialType = "cardboard"
      const originalWeight = 1000
      const recoveredWeight = 850
      const condition = 3 // CONDITION_GOOD
      const recoveryLocation = "Warehouse District A"
      
      const result = recordRecovery(
          contractState,
          packageId,
          manufacturer,
          materialType,
          originalWeight,
          recoveredWeight,
          condition,
          recoveryLocation,
      )
      
      expect(result.success).toBe(true)
      expect(result.value).toBe(packageId)
      expect(contractState.recoveryRecords.has(packageId)).toBe(true)
      expect(contractState.totalRecoveryEvents).toBe(1)
      
      const record = contractState.recoveryRecords.get(packageId)
      expect(record.manufacturer).toBe(manufacturer)
      expect(record.materialType).toBe(materialType)
      expect(record.originalWeight).toBe(originalWeight)
      expect(record.recoveredWeight).toBe(recoveredWeight)
      expect(record.condition).toBe(condition)
      expect(record.recoveryLocation).toBe(recoveryLocation)
    })
    
    it("should update material inventory correctly", () => {
      const packageId = "PKG-001-2024"
      const materialType = "cardboard"
      const recoveredWeight = 850
      const condition = 3 // CONDITION_GOOD
      
      recordRecovery(
          contractState,
          packageId,
          "SP2MANUFACTURER123",
          materialType,
          1000,
          recoveredWeight,
          condition,
          "Warehouse A",
      )
      
      const inventory = contractState.materialInventory.get(materialType)
      expect(inventory.totalRecovered).toBe(recoveredWeight)
      expect(inventory.availableForReuse).toBe(recoveredWeight) // Good condition
      expect(inventory.qualityGrade).toBe(condition)
    })
    
    it("should not add to reuse inventory for poor condition materials", () => {
      const packageId = "PKG-002-2024"
      const materialType = "plastic"
      const recoveredWeight = 500
      const condition = 1 // CONDITION_POOR
      
      recordRecovery(
          contractState,
          packageId,
          "SP2MANUFACTURER123",
          materialType,
          600,
          recoveredWeight,
          condition,
          "Warehouse B",
      )
      
      const inventory = contractState.materialInventory.get(materialType)
      expect(inventory.totalRecovered).toBe(recoveredWeight)
      expect(inventory.availableForReuse).toBe(0) // Poor condition, not reusable
    })
    
    it("should fail when package already recovered", () => {
      const packageId = "PKG-001-2024"
      
      // Record first recovery
      recordRecovery(contractState, packageId, "SP2MANUFACTURER123", "cardboard", 1000, 850, 3, "Warehouse A")
      
      // Try to record again
      const result = recordRecovery(
          contractState,
          packageId,
          "SP2MANUFACTURER123",
          "cardboard",
          1000,
          850,
          3,
          "Warehouse A",
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(202) // ERR_ALREADY_RECOVERED
    })
    
    it("should fail with invalid condition", () => {
      const result = recordRecovery(
          contractState,
          "PKG-003-2024",
          "SP2MANUFACTURER123",
          "cardboard",
          1000,
          850,
          5, // Invalid condition (> 4)
          "Warehouse A",
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(203) // ERR_INVALID_CONDITION
    })
    
    it("should fail with zero recovered weight", () => {
      const result = recordRecovery(
          contractState,
          "PKG-004-2024",
          "SP2MANUFACTURER123",
          "cardboard",
          1000,
          0, // Zero recovered weight
          3,
          "Warehouse A",
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toBe(201) // ERR_INVALID_PACKAGE
    })
  })
  
  describe("calculate-recovery-efficiency", () => {
    it("should calculate efficiency correctly", () => {
      const packageId = "PKG-001-2024"
      recordRecovery(contractState, packageId, "SP2MANUFACTURER123", "cardboard", 1000, 850, 3, "Warehouse A")
      
      const efficiency = calculateRecoveryEfficiency(contractState, packageId)
      
      expect(efficiency).toBe(85) // (850 / 1000) * 100
    })
    
    it("should return undefined for non-existent package", () => {
      const efficiency = calculateRecoveryEfficiency(contractState, "PKG-NONEXISTENT")
      
      expect(efficiency).toBeUndefined()
    })
  })
  
  describe("get-recovery-record", () => {
    it("should return recovery record when exists", () => {
      const packageId = "PKG-001-2024"
      recordRecovery(contractState, packageId, "SP2MANUFACTURER123", "cardboard", 1000, 850, 3, "Warehouse A")
      
      const record = getRecoveryRecord(contractState, packageId)
      
      expect(record).toBeDefined()
      expect(record.packageId).toBe(packageId)
      expect(record.materialType).toBe("cardboard")
    })
    
    it("should return undefined when record does not exist", () => {
      const record = getRecoveryRecord(contractState, "PKG-NONEXISTENT")
      
      expect(record).toBeUndefined()
    })
  })
  
  describe("get-material-inventory", () => {
    it("should return material inventory when exists", () => {
      recordRecovery(contractState, "PKG-001-2024", "SP2MANUFACTURER123", "cardboard", 1000, 850, 3, "Warehouse A")
      
      const inventory = getMaterialInventory(contractState, "cardboard")
      
      expect(inventory).toBeDefined()
      expect(inventory.totalRecovered).toBe(850)
      expect(inventory.availableForReuse).toBe(850)
    })
    
    it("should return undefined when inventory does not exist", () => {
      const inventory = getMaterialInventory(contractState, "nonexistent-material")
      
      expect(inventory).toBeUndefined()
    })
  })
})

// Helper functions
function recordRecovery(
    state,
    packageId,
    manufacturer,
    materialType,
    originalWeight,
    recoveredWeight,
    condition,
    recoveryLocation,
) {
  if (state.recoveryRecords.has(packageId)) {
    return { success: false, error: 202 }
  }
  
  if (condition > 4) {
    return { success: false, error: 203 }
  }
  
  if (recoveredWeight <= 0) {
    return { success: false, error: 201 }
  }
  
  // Record the recovery
  state.recoveryRecords.set(packageId, {
    packageId,
    manufacturer,
    materialType,
    originalWeight,
    recoveredWeight,
    condition,
    recoveryDate: Date.now(),
    recoveryLocation,
    recoveredBy: "current-user",
  })
  
  // Update inventory
  const currentInventory = state.materialInventory.get(materialType) || {
    totalRecovered: 0,
    availableForReuse: 0,
    qualityGrade: 0,
  }
  
  state.materialInventory.set(materialType, {
    totalRecovered: currentInventory.totalRecovered + recoveredWeight,
    availableForReuse: currentInventory.availableForReuse + (condition >= 3 ? recoveredWeight : 0),
    qualityGrade: condition,
  })
  
  state.totalRecoveryEvents += 1
  return { success: true, value: packageId }
}

function calculateRecoveryEfficiency(state, packageId) {
  const record = state.recoveryRecords.get(packageId)
  if (!record) return undefined
  
  return Math.floor((record.recoveredWeight / record.originalWeight) * 100)
}

function getRecoveryRecord(state, packageId) {
  return state.recoveryRecords.get(packageId)
}

function getMaterialInventory(state, materialType) {
  return state.materialInventory.get(materialType)
}
