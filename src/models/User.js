const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: true, // nullable for regular users
    unique: true,
    validate: {
      len: [3, 100],
      isAlphanumeric: {
        msg: 'Username must contain only letters and numbers'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [1, 255]
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  user_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
    field: 'user_type',
    validate: {
      isIn: [['user', 'admin']]
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  token_balance: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'token_balance',
    validate: {
      min: 0
    }
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'users',
  schema: 'auth',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username'],
      where: {
        username: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      fields: ['user_type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  return values;
};

// Class methods
User.findByUsernameOrEmail = function(identifier, options = {}) {
  const { Op } = require('sequelize');
  return this.findOne({
    where: {
      [Op.or]: [
        { username: identifier },
        { email: identifier }
      ],
      ...options.where
    },
    ...options
  });
};

User.associate = function(models) {
  // User has many AnalysisJobs
  User.hasMany(models.AnalysisJob, {
    foreignKey: 'user_id',
    as: 'analysisJobs',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });

  // User has many AnalysisResults
  User.hasMany(models.AnalysisResult, {
    foreignKey: 'user_id',
    as: 'analysisResults',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  });
};

module.exports = User;
