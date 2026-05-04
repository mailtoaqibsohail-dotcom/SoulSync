const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    // JSON array of permission strings e.g. ["documents:create","documents:approve"]
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    }
  }, {
    tableName: 'roles',
    indexes: [{ unique: true, fields: ['name'] }]
  });

  Role.associate = (models) => {
    Role.hasMany(models.User, { foreignKey: 'role_id' });
  };

  return Role;
};
