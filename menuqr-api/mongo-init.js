db = db.getSiblingDB('menuqr');

db.createUser({
  user: 'menuqr',
  pwd: 'menuqr123',
  roles: [
    {
      role: 'readWrite',
      db: 'menuqr',
    },
  ],
});

// Create initial collections
db.createCollection('users');
db.createCollection('restaurants');
db.createCollection('categories');
db.createCollection('dishes');
db.createCollection('orders');
