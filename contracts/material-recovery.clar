;; Material Recovery Contract
;; Manages packaging material recovery and tracking

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_INVALID_PACKAGE (err u201))
(define-constant ERR_ALREADY_RECOVERED (err u202))
(define-constant ERR_INVALID_CONDITION (err u203))

;; Material condition types
(define-constant CONDITION_EXCELLENT u4)
(define-constant CONDITION_GOOD u3)
(define-constant CONDITION_FAIR u2)
(define-constant CONDITION_POOR u1)

;; Recovery tracking
(define-map recovery-records
  { package-id: (string-ascii 50) }
  {
    manufacturer: principal,
    material-type: (string-ascii 30),
    original-weight: uint,
    recovered-weight: uint,
    condition: uint,
    recovery-date: uint,
    recovery-location: (string-ascii 100),
    recovered-by: principal
  }
)

;; Material inventory
(define-map material-inventory
  { material-type: (string-ascii 30) }
  {
    total-recovered: uint,
    available-for-reuse: uint,
    quality-grade: uint
  }
)

(define-data-var total-recovery-events uint u0)

;; Record material recovery
(define-public (record-recovery
  (package-id (string-ascii 50))
  (manufacturer principal)
  (material-type (string-ascii 30))
  (original-weight uint)
  (recovered-weight uint)
  (condition uint)
  (recovery-location (string-ascii 100)))
  (begin
    (asserts! (is-none (map-get? recovery-records { package-id: package-id })) ERR_ALREADY_RECOVERED)
    (asserts! (<= condition CONDITION_EXCELLENT) ERR_INVALID_CONDITION)
    (asserts! (> recovered-weight u0) ERR_INVALID_PACKAGE)

    ;; Record the recovery
    (map-set recovery-records
      { package-id: package-id }
      {
        manufacturer: manufacturer,
        material-type: material-type,
        original-weight: original-weight,
        recovered-weight: recovered-weight,
        condition: condition,
        recovery-date: block-height,
        recovery-location: recovery-location,
        recovered-by: tx-sender
      }
    )

    ;; Update material inventory
    (let ((current-inventory (default-to
                               { total-recovered: u0, available-for-reuse: u0, quality-grade: u0 }
                               (map-get? material-inventory { material-type: material-type }))))
      (map-set material-inventory
        { material-type: material-type }
        {
          total-recovered: (+ (get total-recovered current-inventory) recovered-weight),
          available-for-reuse: (+ (get available-for-reuse current-inventory)
                                  (if (>= condition CONDITION_GOOD) recovered-weight u0)),
          quality-grade: condition
        }
      )
    )

    (var-set total-recovery-events (+ (var-get total-recovery-events) u1))
    (ok package-id)
  )
)

;; Get recovery record
(define-read-only (get-recovery-record (package-id (string-ascii 50)))
  (map-get? recovery-records { package-id: package-id })
)

;; Get material inventory
(define-read-only (get-material-inventory (material-type (string-ascii 30)))
  (map-get? material-inventory { material-type: material-type })
)

;; Calculate recovery efficiency
(define-read-only (calculate-recovery-efficiency (package-id (string-ascii 50)))
  (match (map-get? recovery-records { package-id: package-id })
    record (let ((efficiency (/ (* (get recovered-weight record) u100) (get original-weight record))))
             (some efficiency))
    none
  )
)

;; Get total recovery events
(define-read-only (get-total-recovery-events)
  (var-get total-recovery-events)
)
