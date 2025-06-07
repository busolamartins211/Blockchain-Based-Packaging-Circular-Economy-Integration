;; Packaging Manufacturer Verification Contract
;; Validates and manages packaging manufacturers in the circular economy

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_MANUFACTURER_EXISTS (err u101))
(define-constant ERR_MANUFACTURER_NOT_FOUND (err u102))
(define-constant ERR_INVALID_STATUS (err u103))

;; Manufacturer status types
(define-constant STATUS_PENDING u0)
(define-constant STATUS_VERIFIED u1)
(define-constant STATUS_SUSPENDED u2)

;; Data structure for manufacturers
(define-map manufacturers
  { manufacturer-id: principal }
  {
    name: (string-ascii 100),
    certification-level: uint,
    sustainability-score: uint,
    status: uint,
    verified-at: uint,
    materials-produced: (list 10 (string-ascii 50))
  }
)

;; Track total verified manufacturers
(define-data-var total-manufacturers uint u0)

;; Register a new manufacturer
(define-public (register-manufacturer
  (manufacturer-id principal)
  (name (string-ascii 100))
  (materials (list 10 (string-ascii 50))))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-none (map-get? manufacturers { manufacturer-id: manufacturer-id })) ERR_MANUFACTURER_EXISTS)

    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      {
        name: name,
        certification-level: u1,
        sustainability-score: u50,
        status: STATUS_PENDING,
        verified-at: u0,
        materials-produced: materials
      }
    )

    (var-set total-manufacturers (+ (var-get total-manufacturers) u1))
    (ok manufacturer-id)
  )
)

;; Verify a manufacturer
(define-public (verify-manufacturer
  (manufacturer-id principal)
  (certification-level uint)
  (sustainability-score uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-some (map-get? manufacturers { manufacturer-id: manufacturer-id })) ERR_MANUFACTURER_NOT_FOUND)

    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      (merge
        (unwrap-panic (map-get? manufacturers { manufacturer-id: manufacturer-id }))
        {
          certification-level: certification-level,
          sustainability-score: sustainability-score,
          status: STATUS_VERIFIED,
          verified-at: block-height
        }
      )
    )

    (ok true)
  )
)

;; Get manufacturer details
(define-read-only (get-manufacturer (manufacturer-id principal))
  (map-get? manufacturers { manufacturer-id: manufacturer-id })
)

;; Check if manufacturer is verified
(define-read-only (is-verified (manufacturer-id principal))
  (match (map-get? manufacturers { manufacturer-id: manufacturer-id })
    manufacturer (is-eq (get status manufacturer) STATUS_VERIFIED)
    false
  )
)

;; Get total manufacturers count
(define-read-only (get-total-manufacturers)
  (var-get total-manufacturers)
)
