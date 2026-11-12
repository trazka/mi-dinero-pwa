// A reload may finish while this worker activates, after its first clients.claim.
// Claim the current in-scope document on request, without forcing a reload.
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "MI_DINERO_CLAIM") {
    event.waitUntil(self.clients.claim());
  }
});
