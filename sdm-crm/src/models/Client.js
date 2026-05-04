const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    // Short unique code e.g. "ARAMCO", "SABIC"
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    company_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    contact_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING(191),
      allowNull: true,
      validate: { isEmail: true }
    },
    contact_phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'clients',
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['company_name'] }
    ]
  });

  Client.associate = (models) => {
    Client.hasMany(models.Project, { foreignKey: 'client_id', as: 'projects' });
    Client.hasMany(models.Document, { foreignKey: 'client_id', as: 'documents' });
  };

  return Client;
};
