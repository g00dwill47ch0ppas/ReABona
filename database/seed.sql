INSERT dbo.Roles (RoleID, RoleName)
VALUES (1, 'Citizen'), (2, 'Official'), (3, 'Manager'), (4, 'Administrator');

INSERT dbo.Statuses (StatusID, StatusName, SortOrder)
VALUES
  (1, 'Submitted', 1),
  (2, 'Under review', 2),
  (3, 'Assigned', 3),
  (4, 'Referred', 4),
  (5, 'In progress', 5),
  (6, 'Awaiting information', 6),
  (7, 'Resolved', 7),
  (8, 'Closed', 8);

INSERT dbo.Categories (CategoryName)
VALUES
  ('Water and sanitation'),
  ('Education'),
  ('Healthcare'),
  ('Roads and infrastructure'),
  ('Electricity'),
  ('Waste management'),
  ('Other public-service issues');

INSERT dbo.Institutions (InstitutionName, InstitutionType, District)
VALUES
  ('Demo Local Municipality', 'Municipality', 'Demo District'),
  ('Department of Education (demo)', 'Department', 'Demo District'),
  ('Department of Health (demo)', 'Department', 'Demo District'),
  ('Department of Public Works and Roads (demo)', 'Department', 'Demo District');

INSERT dbo.RoutingRules (CategoryID, District, InstitutionID)
VALUES
  (1, 'Demo District', 1),
  (2, 'Demo District', 2),
  (3, 'Demo District', 3),
  (4, 'Demo District', 4),
  (5, 'Demo District', 1),
  (6, 'Demo District', 1);

INSERT dbo.Users (FullName, Email, RoleID, InstitutionID)
VALUES
  ('Demo Citizen', 'citizen@example.test', 1, NULL),
  ('Demo Municipal Official', 'official.municipality@example.test', 2, 1),
  ('Demo Education Official', 'official.education@example.test', 2, 2),
  ('Demo Manager', 'manager@example.test', 3, 1),
  ('Demo Administrator', 'admin@example.test', 4, NULL);
