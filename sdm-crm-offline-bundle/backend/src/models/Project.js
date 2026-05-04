const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(300),
      allowNull: false
    },
    client_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'on_hold', 'completed', 'cancelled'),
      defaultValue: 'active'
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'projects',
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['client_id'] },
      { fields: ['status'] }
    ]
  });

  Project.associate = (models) => {
    Project.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
    Project.hasMany(models.Document, { foreignKey: 'project_id', as: 'documents' });
  };

  return Project;
};
