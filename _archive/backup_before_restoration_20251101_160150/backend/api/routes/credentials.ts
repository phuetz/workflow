import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { upsertCredential, listCredentials, deleteCredential, getCredentialDecrypted } from '../repositories/adapters';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ credentials: listCredentials() });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { kind, name, ...rest } = req.body || {};
  if (!kind) throw new ApiError(400, 'Credential kind is required');
  const created = upsertCredential({ id: undefined as any, kind, name, ...(rest || {}) } as any);
  // Return without secrets
  res.status(201).json({ id: created.id, name: created.name, kind: created.kind, createdAt: created.createdAt, updatedAt: created.updatedAt });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const cred = getCredentialDecrypted(req.params.id);
  if (!cred) throw new ApiError(404, 'Credential not found');
  res.json({ id: cred.id, name: cred.name, kind: cred.kind, createdAt: cred.createdAt, updatedAt: cred.updatedAt });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const ok = deleteCredential(req.params.id);
  if (!ok) throw new ApiError(404, 'Credential not found');
  res.json({ success: true });
}));

export default router;
