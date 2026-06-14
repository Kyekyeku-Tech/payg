rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    /* ================= HELPERS ================= */

    function signedIn() {
      return request.auth != null;
    }

    function me() {
      return get(
        /databases/$(database)/documents/users/$(request.auth.uid)
      ).data;
    }

    function isGM() {
      return signedIn() && me().role == "gm";
    }

    function isBranchHead() {
      return signedIn() && me().role == "branch_head";
    }

    function sameBranch(resourceData) {
      return resourceData.branchId == me().branchId;
    }

    function isOwner(resourceData) {
      return
        (resourceData.agentId == request.auth.uid) ||
        (resourceData.submittedByUid == request.auth.uid);
    }

    function isOwnerOnCreate(requestData) {
      return
        (requestData.agentId == request.auth.uid) ||
        (requestData.submittedByUid == request.auth.uid);
    }

    function canDeleteReports() {
      return isGM() &&
        me().permissions != null &&
        me().permissions.deleteReports == true;
    }

    /* ================= USERS ================= */
    match /users/{userId} {

      allow create: if signedIn()
        && request.auth.uid == userId;

      allow read: if signedIn() && (
        request.auth.uid == userId ||
        isGM() ||
        (isBranchHead() && sameBranch(resource.data)) ||
        request.query != null
      );

      allow update: if signedIn() && (
        (
          request.auth.uid == userId &&
          request.resource.data
            .diff(resource.data)
            .affectedKeys()
            .hasOnly([
              "name",
              "phone",
              "online",
              "lastLogin",
              "lastSeen"
            ])
        ) ||
        isGM()
      );

      allow delete: if isGM();
    }

    /* ================= ACTIVITY LOGS ================= */
    match /activityLogs/{id} {
      allow read: if isGM();
      allow create: if signedIn();
      allow update, delete: if false;
    }

    /* ================= REPORTS (OLD APP) ================= */
    match /reports/{reportId} {

      allow create: if signedIn()
        && isOwnerOnCreate(request.resource.data)
        && me().role in ["agent", "branch_head"];

      allow read: if signedIn() && (
        isOwner(resource.data) ||
        (isBranchHead() && sameBranch(resource.data)) ||
        isGM()
      );

      allow update: if isGM();

      allow delete: if canDeleteReports();
    }

    /* ================= SIMS REPORTS (THIS APP) ================= */
    match /Sims_reports/{reportId} {

      allow create: if signedIn()
        && isOwnerOnCreate(request.resource.data)
        && me().role in ["agent", "branch_head"];

      allow read: if signedIn() && (
        isOwner(resource.data) ||
        (isBranchHead() && sameBranch(resource.data)) ||
        isGM()
      );

      allow update: if isGM();

      allow delete: if canDeleteReports();
    }

    /* ================= REPORT DELETIONS (AUDIT) ================= */
    match /report_deletions/{logId} {
      allow read: if isGM();
      allow create: if signedIn();
      allow update: if isGM();
      allow delete: if false;
    }

    /* ================= ECW REPORTS ================= */
    match /Report_ECW/{ecwId} {

      allow create: if signedIn()
        && isOwnerOnCreate(request.resource.data)
        && me().role in ["agent", "branch_head"];

      allow read: if signedIn() && (
        isOwner(resource.data) ||
        (isBranchHead() && sameBranch(resource.data)) ||
        isGM()
      );

      allow update, delete: if isGM();
    }

    /* ================= CUSTOMER SUGGESTIONS ================= */
    match /customer_suggestions/{suggestionId} {
      allow create: if signedIn()
        && request.auth.uid == request.resource.data.agentId
        && me().role in ["agent", "branch_head"];

      allow read: if signedIn() && (
        request.auth.uid == resource.data.agentId ||
        (isBranchHead() && sameBranch(resource.data)) ||
        isGM()
      );

      allow update: if signedIn()
        && request.auth.uid == resource.data.agentId;

      allow delete: if false;
    }

    /* ================= CUSTOMERS ================= */
    match /customers/{customerId} {
      allow create: if signedIn()
        && request.auth.uid == request.resource.data.agentId
        && me().role in ["agent", "branch_head"]
        && me().branchId != null
        && request.resource.data.branchId == me().branchId;

      allow read: if signedIn() && (
        request.auth.uid == resource.data.agentId ||
        sameBranch(resource.data) ||
        isGM()
      );

      allow update: if signedIn()
        && request.auth.uid == resource.data.agentId;

      allow delete: if isGM();
    }
  }
}
