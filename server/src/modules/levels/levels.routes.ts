import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';
import { getSingleParam } from '../../utils/request-param';
import { createLevelSchema, updateLevelSchema } from './levels.schemas';
import { levelsService } from './levels.service';

export const levelsRouter = Router();

levelsRouter.get(
  '/official',
  asyncHandler(async (_request, response) => {
    const levels = await levelsService.listOfficial();
    response.json({ levels });
  }),
);

levelsRouter.get(
  '/official/:slugOrId',
  asyncHandler(async (request, response) => {
    const level = await levelsService.getOfficial(getSingleParam(request.params.slugOrId, 'slugOrId'));
    response.json({ level });
  }),
);

levelsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (request, response) => {
    const levels = await levelsService.getMine(request.authUser!.id);
    response.json({ levels });
  }),
);

levelsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = createLevelSchema.parse(request.body);
    const level = await levelsService.create(request.authUser!, payload);
    response.status(201).json({ level });
  }),
);

levelsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const level = await levelsService.getById(request.authUser!, getSingleParam(request.params.id, 'id'));
    response.json({ level });
  }),
);

levelsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const payload = updateLevelSchema.parse(request.body);
    const level = await levelsService.update(
      request.authUser!,
      getSingleParam(request.params.id, 'id'),
      payload,
    );
    response.json({ level });
  }),
);

levelsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const level = await levelsService.delete(request.authUser!, getSingleParam(request.params.id, 'id'));
    response.json({ level });
  }),
);

levelsRouter.post(
  '/:id/submit',
  requireAuth,
  asyncHandler(async (request, response) => {
    const level = await levelsService.submit(request.authUser!, getSingleParam(request.params.id, 'id'));
    response.json({ level });
  }),
);
