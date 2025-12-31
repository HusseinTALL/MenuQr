/**
 * Table Controller for MenuQR
 * Handles CRUD operations for restaurant tables
 */

import { Request, Response } from 'express';
import { Table, Restaurant } from '../models/index.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as auditService from '../services/auditService.js';

/**
 * Get all tables for the current restaurant (admin)
 */
export const getTables = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const tables = await Table.find({ restaurantId: restaurant._id }).sort({ order: 1, name: 1 });

  res.json({
    success: true,
    message: 'Tables récupérées avec succès',
    data: tables,
  });
});

/**
 * Get a single table by ID
 */
export const getTableById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const table = await Table.findById(id);
  if (!table) {
    throw new ApiError(404, 'Table non trouvée');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé');
  }

  res.json({
    success: true,
    message: 'Table récupérée avec succès',
    data: table,
  });
});

/**
 * Create a new table
 */
export const createTable = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  // Get highest order
  const lastTable = await Table.findOne({ restaurantId: restaurant._id })
    .sort({ order: -1 })
    .select('order');
  const order = lastTable ? lastTable.order + 1 : 0;

  // Extract only allowed fields (prevent field injection)
  const { name, capacity, minCapacity, location } = req.body;

  const table = await Table.create({
    name,
    capacity,
    minCapacity,
    location,
    restaurantId: restaurant._id,
    order,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    const tableDoc = Array.isArray(table) ? table[0] : table;
    await auditService.auditCreate(
      'table',
      auditUser,
      { type: 'Table', id: tableDoc._id, name: tableDoc.name },
      `Table "${tableDoc.name}" created`,
      auditService.getRequestInfo(req),
      { capacity: tableDoc.capacity, location: tableDoc.location }
    );
  }

  res.status(201).json({
    success: true,
    message: 'Table créée avec succès',
    data: table,
  });
});

/**
 * Update a table
 */
export const updateTable = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const table = await Table.findById(id);
  if (!table) {
    throw new ApiError(404, 'Table non trouvée');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à modifier cette table');
  }

  // Store old values for audit
  const oldName = table.name;
  const oldCapacity = table.capacity;

  const updatedTable = await Table.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser && updatedTable) {
    const changes = [];
    if (req.body.name && req.body.name !== oldName) {changes.push({ field: 'name', oldValue: oldName, newValue: updatedTable.name });}
    if (req.body.capacity !== undefined && req.body.capacity !== oldCapacity) {changes.push({ field: 'capacity', oldValue: oldCapacity, newValue: updatedTable.capacity });}

    await auditService.auditUpdate(
      'table',
      auditUser,
      { type: 'Table', id: table._id, name: updatedTable.name },
      changes.length > 0 ? changes : undefined,
      `Table "${updatedTable.name}" updated`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Table mise à jour avec succès',
    data: updatedTable,
  });
});

/**
 * Delete a table
 */
export const deleteTable = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const table = await Table.findById(id);
  if (!table) {
    throw new ApiError(404, 'Table non trouvée');
  }

  // Check ownership
  const restaurant = await Restaurant.findById(table.restaurantId);
  if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Non autorisé à supprimer cette table');
  }

  // Store table info for audit
  const tableName = table.name;

  await Table.findByIdAndDelete(id);

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditDelete(
      'table',
      auditUser,
      { type: 'Table', id: table._id, name: tableName },
      `Table "${tableName}" deleted`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Table supprimée avec succès',
  });
});

/**
 * Toggle table active status
 */
export const toggleTableStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = req.params;

    const table = await Table.findById(id);
    if (!table) {
      throw new ApiError(404, 'Table non trouvée');
    }

    // Check ownership
    const restaurant = await Restaurant.findById(table.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, 'Non autorisé');
    }

    const oldActive = table.isActive;
    table.isActive = !table.isActive;
    await table.save();

    // Audit log
    const auditUser = auditService.getUserFromRequest(req);
    if (auditUser) {
      await auditService.auditUpdate(
        'table',
        auditUser,
        { type: 'Table', id: table._id, name: table.name },
        [{ field: 'isActive', oldValue: oldActive, newValue: table.isActive }],
        `Table "${table.name}" ${table.isActive ? 'activated' : 'deactivated'}`,
        auditService.getRequestInfo(req)
      );
    }

    res.json({
      success: true,
      message: table.isActive ? 'Table activée' : 'Table désactivée',
      data: table,
    });
  }
);

/**
 * Reorder tables
 */
export const reorderTables = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { tables } = req.body;

  if (!Array.isArray(tables)) {
    throw new ApiError(400, 'Format invalide: tables doit être un tableau');
  }

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  // Update order for each table
  const updates = tables.map((item: { id: string; order: number }) =>
    Table.findOneAndUpdate(
      { _id: item.id, restaurantId: restaurant._id },
      { order: item.order },
      { new: true }
    )
  );

  await Promise.all(updates);

  // Fetch updated tables
  const updatedTables = await Table.find({ restaurantId: restaurant._id }).sort({ order: 1, name: 1 });

  res.json({
    success: true,
    message: 'Tables réordonnées avec succès',
    data: updatedTables,
  });
});

/**
 * Bulk create tables (for quick setup)
 */
export const bulkCreateTables = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { tables } = req.body;

    if (!Array.isArray(tables) || tables.length === 0) {
      throw new ApiError(400, 'Format invalide: tables doit être un tableau non vide');
    }

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    // Get current highest order
    const lastTable = await Table.findOne({ restaurantId: restaurant._id })
      .sort({ order: -1 })
      .select('order');
    let currentOrder = lastTable ? lastTable.order + 1 : 0;

    // Create tables with incremental order
    const tablesToCreate = tables.map((table: { name: string; capacity: number; location?: string }) => ({
      ...table,
      restaurantId: restaurant._id,
      order: currentOrder++,
    }));

    const createdTables = await Table.insertMany(tablesToCreate);

    res.status(201).json({
      success: true,
      message: `${createdTables.length} tables créées avec succès`,
      data: createdTables,
    });
  }
);

/**
 * Get tables by location
 */
export const getTablesByLocation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { location } = req.params;

    // Validate location parameter
    const validLocations = ['indoor', 'outdoor', 'terrace', 'private'];
    if (!validLocations.includes(location)) {
      throw new ApiError(400, 'Emplacement invalide (indoor, outdoor, terrace, private)');
    }

    const restaurant = await Restaurant.findOne({ ownerId: user._id });
    if (!restaurant) {
      throw new ApiError(404, 'Restaurant non trouvé');
    }

    const tables = await Table.find({
      restaurantId: restaurant._id,
      location,
      isActive: true,
    }).sort({ order: 1, name: 1 });

    res.json({
      success: true,
      message: 'Tables récupérées avec succès',
      data: tables,
    });
  }
);

/**
 * Get table statistics
 */
export const getTableStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  const restaurant = await Restaurant.findOne({ ownerId: user._id });
  if (!restaurant) {
    throw new ApiError(404, 'Restaurant non trouvé');
  }

  const tables = await Table.find({ restaurantId: restaurant._id });

  const stats = {
    total: tables.length,
    active: tables.filter((t) => t.isActive).length,
    inactive: tables.filter((t) => !t.isActive).length,
    byLocation: {
      indoor: tables.filter((t) => t.location === 'indoor').length,
      outdoor: tables.filter((t) => t.location === 'outdoor').length,
      terrace: tables.filter((t) => t.location === 'terrace').length,
      private: tables.filter((t) => t.location === 'private').length,
    },
    totalCapacity: tables.filter((t) => t.isActive).reduce((sum, t) => sum + t.capacity, 0),
    avgCapacity:
      tables.length > 0
        ? Math.round((tables.reduce((sum, t) => sum + t.capacity, 0) / tables.length) * 10) / 10
        : 0,
  };

  res.json({
    success: true,
    message: 'Statistiques récupérées avec succès',
    data: stats,
  });
});
