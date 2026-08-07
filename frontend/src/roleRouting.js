export const ROLE_HOME = {
  SystemAdmin: "/admin",
  BranchAdmin: "/branch",
  Teacher: "/teacher",
  Parent: "/portal",
  Student: "/student",
};

export function roleHomePath(role) {
  return ROLE_HOME[role] || "/login";
}
