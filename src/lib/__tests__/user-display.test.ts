import { userDisplayName } from "../user-display";

it("uses the account username instead of legacy name fields on the website", () => {
  const user = { username: "Linh", email: "learner@example.com", firstName: "old@example.com", lastName: "Old", fullName: "Old name" };
  expect(userDisplayName(user)).toBe("Linh");
});

it("falls back safely when a backend record has no username", () => {
  expect(userDisplayName({ username: " ", email: "learner@example.com" })).toBe("learner@example.com");
  expect(userDisplayName({ username: "", email: null })).toBe("Học viên");
});
