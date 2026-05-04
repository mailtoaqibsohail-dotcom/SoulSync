const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // e.g. ENG, HSE, PROC — used in serial number prefix
    department_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'GEN'
    },
    // Mari Energies MOC hierarchy slot (one per user, e.g. 'manager_production').
    // Null means user does not sit in the MOC approval chain.
    moc_position: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    // Direct manager for delegation: an assignee may delegate a pending step
    // to anyone whose manager chain leads back up to them.
    manager_user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    role_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    // For client-portal users: the Client (company) they belong to
    client_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['role_id'] },
      { fields: ['department_code'] }
    ]
  });

  // Hash password before create/update
  User.beforeCreate(async (user) => {
    user.password_hash = await bcrypt.hash(user.password_hash, 12);
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password_hash')) {
      user.password_hash = await bcrypt.hash(user.password_hash, 12);
    }
  });

  User.prototype.verifyPassword = function (plain) {
    return bcrypt.compare(plain, this.password_hash);
  };

  User.prototype.toSafeObject = function () {
    const { password_hash, ...safe } = this.get({ plain: true });
    return safe;
  };

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    User.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
    User.belongsTo(models.User, { foreignKey: 'manager_user_id', as: 'manager' });
    User.hasMany(models.User,   { foreignKey: 'manager_user_id', as: 'reports' });
    User.hasMany(models.Document, { foreignKey: 'created_by', as: 'created_documents' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
  };

  return User;
};
