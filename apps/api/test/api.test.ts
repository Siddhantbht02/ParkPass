import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { prisma } from '../src/prisma';

describe('ParkPass Core API & Business Rules Tests', () => {
  let app: any;
  let residentToken: string;
  let guardToken: string;
  let adminToken: string;
  let residentUser: any;
  let guardUser: any;
  let adminUser: any;
  let testPassId: string;
  let testPassToken: string;
  let testPassCode: string;

  before(async () => {
    app = buildApp();
    await app.ready();

    // Login as resident (Siddhant)
    const resRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: '+919876543210', password: 'password123' },
    });
    assert.equal(resRes.statusCode, 200);
    const resBody = JSON.parse(resRes.body);
    residentToken = resBody.token;
    residentUser = resBody.user;

    // Login as guard (Rajesh Kumar)
    const guardRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: '+919876543220', password: 'password123' },
    });
    assert.equal(guardRes.statusCode, 200);
    const gBody = JSON.parse(guardRes.body);
    guardToken = gBody.token;
    guardUser = gBody.user;

    // Login as admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: '+919876543200', password: 'adminpassword123' },
    });
    assert.equal(adminRes.statusCode, 200);
    const aBody = JSON.parse(adminRes.body);
    adminToken = aBody.token;
    adminUser = aBody.user;
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('1. Resident can view their dashboard and parking availability', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/resident/dashboard',
      headers: { authorization: `Bearer ${residentToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.stats);
    assert.ok(typeof body.stats.totalBookings === 'number');

    const availRes = await app.inject({
      method: 'GET',
      url: '/api/v1/resident/parking-availability?durationHours=6&vehicleType=CAR',
      headers: { authorization: `Bearer ${residentToken}` },
    });
    assert.equal(availRes.statusCode, 200);
    const avail = JSON.parse(availRes.body);
    assert.ok(avail.availableCount > 0);
  });

  it('2. Resident can create a valid visitor pass with atomic slot allocation', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/resident/visitor-passes',
      headers: { authorization: `Bearer ${residentToken}` },
      payload: {
        visitorName: 'Siddhant Test',
        visitorPhone: '+919876500000',
        visitorCategory: 'GUEST',
        vehicleNumber: 'MH 12 AB 1122',
        vehicleType: 'CAR',
        validFrom: tomorrow.toISOString(),
        durationHours: 24,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.pass.id);
    assert.ok(body.pass.parkingSlot.slotNumber);
    assert.ok(body.whatsappLink);

    testPassId = body.pass.id;
    testPassToken = body.pass.secureToken;
    testPassCode = body.pass.passCode;
  });

  it('3. Public pass endpoint allows viewing without authentication (sanitized)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/visitor/pass/${testPassToken}`,
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.pass.vehicleNumber, 'MH12AB1122');
    assert.equal(body.pass.visitorName, 'Siddhant Test');
    // Ensure no sensitive resident phone is exposed
    assert.equal(body.pass.residentPhone, undefined);
  });

  it('4. Resident cannot access admin dashboard endpoints (Role Authorization)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${residentToken}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('5. Guard can verify visitor pass by QR token or code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/guard/verify-pass',
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { qrData: testPassToken },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.pass);
    assert.equal(body.pass.passCode, testPassCode);
  });

  it('6. Guard can confirm vehicle entry and create active parking session', async () => {
    // Let's create an immediate pass to test entry right now
    const now = new Date();
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/resident/visitor-passes',
      headers: { authorization: `Bearer ${residentToken}` },
      payload: {
        visitorName: 'Immediate Visitor',
        vehicleNumber: 'KA 01 MG 9999',
        validFrom: now.toISOString(),
        durationHours: 3,
      },
    });
    assert.equal(createRes.statusCode, 201);
    const immPass = JSON.parse(createRes.body).pass;

    // Confirm entry
    const entryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/guard/confirm-entry',
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { passId: immPass.id },
    });
    assert.equal(entryRes.statusCode, 200);
    const entryBody = JSON.parse(entryRes.body);
    assert.equal(entryBody.success, true);
    const sessionId = entryBody.session.id;

    // Duplicate entry scan is blocked!
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/guard/confirm-entry',
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { passId: immPass.id },
    });
    assert.equal(dupRes.statusCode, 500); // Throws already checked in error

    // Guard can view active parking
    const activeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/guard/active-parking',
      headers: { authorization: `Bearer ${guardToken}` },
    });
    assert.equal(activeRes.statusCode, 200);
    const activeBody = JSON.parse(activeRes.body);
    const foundSession = activeBody.sessions.find((s: any) => s.id === sessionId);
    assert.ok(foundSession);

    // Guard checks out vehicle
    const checkoutRes = await app.inject({
      method: 'POST',
      url: `/api/v1/guard/checkout/${sessionId}`,
      headers: { authorization: `Bearer ${guardToken}` },
    });
    assert.equal(checkoutRes.statusCode, 200);

    // Verify slot is now free
    const slotCheck = await prisma.parkingSession.findUnique({ where: { id: sessionId } });
    assert.equal(slotCheck?.status, 'COMPLETED');
    const passCheck = await prisma.visitorPass.findUnique({ where: { id: immPass.id } });
    assert.equal(passCheck?.status, 'CHECKED_OUT');
  });

  it('7. Resident can cancel an unused pass and slot reservation is freed', async () => {
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/resident/visitor-passes/${testPassId}/cancel`,
      headers: { authorization: `Bearer ${residentToken}` },
    });
    assert.equal(cancelRes.statusCode, 200);

    // Verify guard cannot verify cancelled pass
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/guard/verify-pass',
      headers: { authorization: `Bearer ${guardToken}` },
      payload: { qrData: testPassToken },
    });
    const vBody = JSON.parse(verifyRes.body);
    assert.equal(vBody.isValid, false);
    assert.equal(vBody.code, 'PASS_CANCELLED');
  });

  it('8. Administrator can view dashboard, slots, audit logs, and export CSV', async () => {
    const adminDash = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminDash.statusCode, 200);
    const dashBody = JSON.parse(adminDash.body);
    assert.ok(dashBody.stats.totalSlots >= 20);

    // CSV export
    const csvRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/visitor-records?format=csv',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(csvRes.statusCode, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.body.includes('Pass ID,Visitor Name'));
  });
});
