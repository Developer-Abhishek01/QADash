import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: Record<string, jest.Mock>;

  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectUser: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('findAll', () => {
    it('returns all projects when no userId is provided', async () => {
      prisma.project.findMany.mockResolvedValue([mockProject]);
      const result = await service.findAll();
      expect(result).toEqual([mockProject]);
      expect(prisma.project.findMany).toHaveBeenCalled();
    });

    it('returns projects filtered by userId', async () => {
      prisma.projectUser.findMany.mockResolvedValue([
        { project: mockProject, userId: 'user-1', role: 'member' },
      ]);
      const result = await service.findAll('user-1');
      expect(result).toEqual([mockProject]);
      expect(prisma.projectUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { project: true },
      });
    });
  });

  describe('findById', () => {
    it('returns a project when found', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);
      const result = await service.findById('proj-1');
      expect(result).toEqual(mockProject);
    });

    it('throws NotFoundException when project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns a project', async () => {
      prisma.project.create.mockResolvedValue(mockProject);
      const result = await service.create({ name: 'Test Project', description: 'A test project' });
      expect(result).toEqual(mockProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: { name: 'Test Project', description: 'A test project', settings: undefined },
      });
    });
  });

  describe('update', () => {
    it('updates and returns the project', async () => {
      prisma.project.update.mockResolvedValue({ ...mockProject, name: 'Updated' });
      const result = await service.update('proj-1', { name: 'Updated' });
      expect(result).toHaveProperty('name', 'Updated');
    });
  });

  describe('delete', () => {
    it('deletes the project', async () => {
      prisma.project.delete.mockResolvedValue(mockProject);
      await expect(service.delete('proj-1')).resolves.toEqual(mockProject);
    });
  });

  describe('addUser', () => {
    it('adds a user to the project', async () => {
      prisma.projectUser.create.mockResolvedValue({ projectId: 'proj-1', userId: 'user-1', role: 'member' });
      const result = await service.addUser('proj-1', 'user-1');
      expect(result).toHaveProperty('role', 'member');
    });
  });

  describe('removeUser', () => {
    it('removes a user from the project', async () => {
      prisma.projectUser.delete.mockResolvedValue({ projectId: 'proj-1', userId: 'user-1' });
      await expect(service.removeUser('proj-1', 'user-1')).resolves.toBeDefined();
    });
  });
});
