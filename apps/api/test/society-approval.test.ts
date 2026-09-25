import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';

test('Society Unique ID and Resident/Guard Approval Flow', async (t) => {
  const app = await buildApp();

  await t.test('1. Society Lookup by Unique Code', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/society/lookup?code=SKYLINE-101',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.found, true);
    assert.equal(body.society.code, 'SKYLINE-101');
    assert.equal(body.society.name, 'Skyline Residency');
  });

  await t.test('2. Resident Registration Request creates PENDING user', async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const residentPhone = `+9198700${randomSuffix}`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register-request',
      payload: {
        societyCode: 'SKYLINE-101',
        role: 'RESIDENT',
        name: 'Kabir Verma',
        phone: residentPhone,
        email: `kabir${randomSuffix}@example.com`,
        password: 'password123',
        towerName: 'Tower A',
        flatNumber: '901',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.approvalStatus, 'PENDING');
    assert.equal(body.role, 'RESIDENT');

    // 3. Unapproved resident cannot login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: residentPhone,
        password: 'password123',
      },
    });
    assert.equal(loginRes.statusCode, 403);
    const loginBody = JSON.parse(loginRes.payload);
    assert.match(loginBody.error, /pending approval/i);

    // 4. Admin logs in
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: '+919876543200',
        password: 'adminpassword123',
      },
    });
    assert.equal(adminLogin.statusCode, 200);
    const adminToken = JSON.parse(adminLogin.payload).token;

    // 5. Admin checks pending approvals
    const pendingRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/pending-approvals',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(pendingRes.statusCode, 200);
    const pendingBody = JSON.parse(pendingRes.payload);
    const pendingKabir = pendingBody.pending.find((u: any) => u.phone === residentPhone);
    assert.ok(pendingKabir, 'Kabir should be in pending list');
    assert.equal(pendingKabir.approvalStatus, 'PENDING');

    // 6. Admin approves Kabir
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/approve-user/${pendingKabir.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(approveRes.statusCode, 200);

    // 7. Approved Kabir can now log in
    const kabirLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: residentPhone,
        password: 'password123',
      },
    });
    assert.equal(kabirLogin.statusCode, 200);
    const kabirUser = JSON.parse(kabirLogin.payload).user;
    assert.equal(kabirUser.name, 'Kabir Verma');
  });

  await t.test('3. Guard Registration Request and Approval', async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guardPhone = `+9198800${randomSuffix}`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register-request',
      payload: {
        societyCode: 'SKYLINE-101',
        role: 'GUARD',
        name: 'Ramesh Guard',
        phone: guardPhone,
        email: `ramesh${randomSuffix}@example.com`,
        password: 'password123',
        gateName: 'North Gate',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.approvalStatus, 'PENDING');

    // Admin approves
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: '+919876543200',
        password: 'adminpassword123',
      },
    });
    const adminToken = JSON.parse(adminLogin.payload).token;

    const pendingRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/pending-approvals',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const pendingGuard = JSON.parse(pendingRes.payload).pending.find((u: any) => u.phone === guardPhone);
    assert.ok(pendingGuard);

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/approve-user/${pendingGuard.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(approveRes.statusCode, 200);

    // Guard logs in
    const guardLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: guardPhone,
        password: 'password123',
      },
    });
    assert.equal(guardLogin.statusCode, 200);
  });

  await t.test('4. Register New Society Generates Unique Society Code', async () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/society/register',
      payload: {
        societyName: `Emerald Heights ${randomSuffix}`,
        societyAddress: 'Kalyani Nagar, Pune',
        adminName: 'Chairman Joshi',
        adminPhone: `+9198900${randomSuffix}`,
        adminEmail: `admin${randomSuffix}@emerald.com`,
        adminPassword: 'password123',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.ok(body.societyCode);
    assert.match(body.societyCode, /EMERALD-\d+/);
  });
});
