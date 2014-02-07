var criterion, values,
  __slice = [].slice;

criterion = require('criterion');

values = function(object) {
  var k, v, vs, _fn;
  vs = [];
  _fn = function(k, v) {
    return vs.push(v);
  };
  for (k in object) {
    v = object[k];
    _fn(k, v);
  }
  return vs;
};

module.exports = {
  set: function(key, value) {
    var object;
    object = Object.create(this);
    object[key] = value;
    return object;
  },
  insert: function(data) {
    var dataArray, keysOfFirstRecord, msg;
    if (data == null) {
      throw new Error('missing data');
    }
    dataArray = Array.isArray(data) ? data : [data];
    if (dataArray.length === 0) {
      throw new Error('no records to insert');
    }
    msg = 'all records in the argument array must have the same keys.';
    keysOfFirstRecord = Object.keys(dataArray[0]);
    dataArray.forEach(function(item) {
      var itemKeys;
      itemKeys = Object.keys(item);
      if (itemKeys.length !== keysOfFirstRecord.length) {
        throw new Error(msg);
      }
      return keysOfFirstRecord.forEach(function(key, index) {
        if (key !== itemKeys[index]) {
          throw new Error(msg);
        }
      });
    });
    return this.set('_action', {
      verb: 'insert',
      param: dataArray
    });
  },
  _escape: function(string) {
    return string;
  },
  _action: {
    verb: 'select',
    param: '*'
  },
  _joins: [],
  escape: function(arg) {
    return this.set('_escape', arg);
  },
  select: function(sql) {
    if (sql == null) {
      sql = '*';
    }
    return this.set('_action', {
      verb: 'select',
      param: sql
    });
  },
  "delete": function() {
    return this.set('_action', {
      verb: 'delete'
    });
  },
  update: function(updates) {
    return this.set('_action', {
      verb: 'update',
      param: updates
    });
  },
  join: function() {
    var criterionArgs, join, object, sql;
    sql = arguments[0], criterionArgs = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    object = Object.create(this);
    object._joins = this._joins.slice();
    join = {
      sql: sql
    };
    if (criterionArgs.length !== 0) {
      join.criterion = criterion.apply(null, criterionArgs);
    }
    object._joins.push(join);
    return object;
  },
  group: function(arg) {
    return this.set('_group', arg);
  },
  order: function(arg) {
    return this.set('_order', arg);
  },
  limit: function(arg) {
    return this.set('_limit', parseInt(arg, 10));
  },
  offset: function(arg) {
    return this.set('_offset', parseInt(arg, 10));
  },
  table: function(table) {
    return this.set('_table', table);
  },
  where: function() {
    var args, where;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    where = criterion.apply(null, args);
    return this.set('_where', this._where != null ? this._where.and(where) : where);
  },
  sql: function() {
    var keys, parts, sql, table, updates;
    if (this._table == null) {
      throw new Error('sql() requires call to table() before it');
    }
    table = this._escape(this._table);
    switch (this._action.verb) {
      case 'insert':
        keys = Object.keys(this._action.param[0]).map((function(_this) {
          return function(key) {
            return _this._escape(key);
          };
        })(this));
        parts = this._action.param.map(function() {
          var questionMarks;
          questionMarks = keys.map(function() {
            return '?';
          });
          return "(" + (questionMarks.join(', ')) + ")";
        });
        return "INSERT INTO " + table + "(" + (keys.join(', ')) + ") VALUES " + (parts.join(', '));
      case 'select':
        sql = "SELECT " + this._action.param + " FROM " + table;
        this._joins.forEach(function(join) {
          sql += " " + join.sql;
          if (join.criterion != null) {
            return sql += " AND (" + (join.criterion.sql()) + ")";
          }
        });
        if (this._where != null) {
          sql += " WHERE " + (this._where.sql());
        }
        if (this._group != null) {
          sql += " GROUP BY " + this._group;
        }
        if (this._order != null) {
          sql += " ORDER BY " + this._order;
        }
        if (this._limit != null) {
          sql += " LIMIT ?";
        }
        if (this._offset != null) {
          sql += " OFFSET ?";
        }
        return sql;
      case 'update':
        keys = Object.keys(this._action.param);
        updates = keys.map((function(_this) {
          return function(k) {
            return "" + (_this._escape(k)) + " = ?";
          };
        })(this)).join(', ');
        sql = "UPDATE " + table + " SET " + updates;
        if (this._where != null) {
          sql += " WHERE " + (this._where.sql());
        }
        return sql;
      case 'delete':
        sql = "DELETE FROM " + table;
        if (this._where != null) {
          sql += " WHERE " + (this._where.sql());
        }
        return sql;
    }
  },
  params: function() {
    var params;
    params = [];
    switch (this._action.verb) {
      case 'insert':
        this._action.param.forEach(function(x) {
          return params = params.concat(values(x));
        });
        break;
      case 'select':
        this._joins.forEach(function(join) {
          if (join.criterion != null) {
            return params = params.concat(join.criterion.params());
          }
        });
        if (this._where != null) {
          params = params.concat(this._where.params());
        }
        if (this._limit != null) {
          params.push(this._limit);
        }
        if (this._offset != null) {
          params.push(this._offset);
        }
        break;
      case 'update':
        params = params.concat(values(this._action.param));
        if (this._where != null) {
          params = params.concat(this._where.params());
        }
        break;
      case 'delete':
        if (this._where != null) {
          params = params.concat(this._where.params());
        }
    }
    return params;
  },
  connect: function(conn) {
    return this.set('_connect', conn);
  },
  exec: function(fn) {
    return this._connect.query(this.sql(), this.params(), function(err, results) {
      return fn(err, results);
    });
  },
  find: function(fn) {
    return this.exec(fn);
  },
  findOne: function(fn) {
    return this._connect.query(this.sql(), this.params(), function(err, results) {
      return fn(err, results != null ? results[0] : void 0);
    });
  },
  first: function(fn) {
    return this.findOne(fn);
  },
  exists: function(fn) {
    return this._connect.query(this.sql(), this.params(), function(err, results) {
      if (err) {
        return fn(err);
      }
      if (results.length) {
        return fn(null, true);
      } else {
        return fn(null, false);
      }
    });
  }
};
