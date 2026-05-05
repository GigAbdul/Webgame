import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createRateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../utils/async-handler';
import { getSingleParam } from '../../utils/request-param';
import {
  createOfficialLevelSchema,
  difficultySchema,
  officialSettingsSchema,
  publishLevelSchema,
} from './admin.schemas';
import { adminService } from './admin.service';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

const adminMutationRateLimit = createRateLimit({
  keyPrefix: 'admin:mutations',
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many admin changes. Slow down and try again.',
});

adminRouter.get(
  '/levels',
  asyncHandler(async (_request, response) => {
    const levels = await adminService.listLevels();
    response.json({ levels });
  }),
);

adminRouter.get(
  '/levels/:id',
  asyncHandler(async (request, response) => {
    const level = await adminService.getLevel(getSingleParam(request.params.id, 'id'));
    response.json({ level });
  }),
);

adminRouter.post(
  '/levels/create-official',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = createOfficialLevelSchema.parse(request.body);
    const level = await adminService.createOfficial(request.authUser!.id, payload);
    response.status(201).json({ level });
  }),
);

adminRouter.patch(
  '/levels/:id/publish',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = publishLevelSchema.parse(request.body);

    const level = await adminService.publishLevel(
      request.authUser!.id,
      getSingleParam(request.params.id, 'id'),
      payload.difficulty,
    );

    response.json({ level });
  }),
);

adminRouter.patch(
  '/levels/:id/archive',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const level = await adminService.archiveLevel(
      request.authUser!.id,
      getSingleParam(request.params.id, 'id'),
    );
    response.json({ level });
  }),
);

adminRouter.patch(
  '/levels/:id/official-settings',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = officialSettingsSchema.parse(request.body);
    const level = await adminService.updateOfficialSettings(
      request.authUser!.id,
      getSingleParam(request.params.id, 'id'),
      payload,
    );
    response.json({ level });
  }),
);

adminRouter.patch(
  '/levels/:id/difficulty',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const payload = difficultySchema.parse(request.body);
    const level = await adminService.patchDifficulty(
      request.authUser!.id,
      getSingleParam(request.params.id, 'id'),
      payload.difficulty,
    );
    response.json({ level });
  }),
);

adminRouter.post(
  '/levels/:id/recalculate-stars',
  adminMutationRateLimit,
  asyncHandler(async (request, response) => {
    const result = await adminService.recalculateStars(getSingleParam(request.params.id, 'id'));
    response.json(result);
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (_request, response) => {
    const users = await adminService.listUsers();
    response.json({ users });
  }),
);

adminRouter.get(
  '/stats',
  asyncHandler(async (_request, response) => {
    const stats = await adminService.stats();
    response.json({ stats });
  }),
);
