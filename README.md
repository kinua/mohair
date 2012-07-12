# mohair

sql query builder for nodejs

*write elegant code to generate sql queries - instead of concatenating strings and pushing to endless parameter lists*

### Install

    npm install mohair

### Use mohair with node-mysql

```coffeescript

mysql = require 'mysql'

connection = mysql.createConnection
    user: 'mysql-username'
    password: 'mysql-password'
    database: 'mysql-database'

connection.connect()

mohair = require 'mohair'

project = mohair.table 'project'

query = project.insert
    name: 'Amazing Project'
    owner_id: 5
    hidden: false

client.query query.sql(), query.params(), (err, result) ->
    throw err if err?
    console.log result

client.end()
```

### Queries

#### select everything

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.select()
```

`query.sql()` returns:

```sql
SELECT * FROM project;
```

`query.params()` returns:

```coffeescript
[]
```

#### select specific columns with a condition

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.select(['name', 'id']).where {hidden: true}
```

**Note:** the last argument is a query object. see section `Query language` below for details.

**Note:** the second argument can also be a string.

`query.sql()` returns:

```sql
SELECT name, id FROM project WHERE hidden = ?;
```

`query.params()` returns:

```coffeescript
[true]
```

#### join, group, order, limit and offset

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project
    .select ['count(task.id) AS taskCount', 'project.*']
    .where {'project.visible': true}
    .leftJoin 'task', 'project.id', 'task.project_id'
    .group 'project.id'
    .order 'project.created_on DESC'
    .limit 10
    .offset 5
```

`query.sql()` returns:

```sql
SELECT
    count(task.id) AS taskCount,
    project.*
FROM project
LEFT JOIN task ON project.id = task.project_id
WHERE project.visible = ?
GROUP BY project.id
ORDER BY project.created_on DESC;
```

`query.params()` returns:

```coffeescript
[true]
```

**Note:** use `join`, `leftJoin`, `rightJoin`, and `innerJoin` as needed.

**Note:** `where` takes a query object. see section `Query language` below for details.


#### insert

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.insert
    name: 'Amazing Project'
    owner_id: 5
    hidden: false
```

`query.sql()` returns:

```sql
INSERT INTO project (name, owner_id, hidden) VALUES (?, ?, ?);
```

`query.params()` returns:

```coffeescript
['Amazing Project', 5, false]
```

#### insert many

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.insert [
    {name: 'First project', hidden: true},
    {name: 'Second project', hidden: false}
]
```

`query.sql()` returns:

```sql
INSERT INTO project (name) VALUES (?, ?), (?, ?);
```

`query.params()` returns:

```coffeescript
['First project', true, 'Second project', false]
```

**Note:** When inserting multiple rows all inserted objects must have the same keys.

#### use arbitrary sql functions and expressions

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.insert
    name: 'Another Project'
    created_on: mohair.sql 'NOW()'
    user_id: mohair.sql 'LAST_INSERT_ID()'
```

`query.sql()` returns:

```sql
INSERT INTO project (name, created_on, user_id) VALUES (?, NOW(), LAST_INSERT_ID());
```

`query.params()` returns:

```coffeescript
['Another Project']
```

#### update on duplicate key

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.insert
    id: 'foo'
    name: 'bar'
query.onDuplicateKeyUpdate
    name: 'bar'
    update_count: mohair.sql 'update_count + 1'
```

`query.sql()` returns:

```sql
INSERT INTO project (id, name) VALUES (?, ?)
ON DUPLICATE KEY UPDATE name = ?, update_count = update_count + 1;
```

`query.params()` returns:

```coffeescript
['foo', 'bar', 'bar']
```

#### update

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = project.update
    name: 'Even more amazing project'
    hidden: true
query.where {id: 7}
```

**Note:** the last argument is a query object. see section `Query language` below for details.

**Note:** you can call `limit` and `order` on the update query.

`query.sql()` returns:

```sql
UPDATE project SET name = ?, hidden = ? WHERE id = ?;
```

`queryparams()` returns:

```coffeescript
['Even more amazing project', true, 7]
```

#### delete

```coffeescript
query = project.delete().where {id: 7, hidden: true}
```

`query.sql()` returns:

```sql
DELETE FROM project WHERE id = ? AND hidden = ?;
```

`query.params()` returns:

```coffeescript
[7, true]
```

**Note:** you can call `limit` and `order` on the delete query.

**Note:** the last argument is a query object. see section `Query language` below for details.

#### transactions

```coffeescript
mohair = require 'mohair'

project = mohair.table 'project'

query = mohair.transaction [
    project.delete().where {id: 7}
    project.update({name: 'New name'}).where {id: 8}
]
```

`query.sql()` returns:

```sql
START TRANSACTION;
DELETE FROM project WHERE id = ?;
UPDATE project SET name = ? WHERE id = ?;
COMMIT;
```

`query.params()` returns:

```coffeescript
[7, 'New name', 8]
```
#### raw sql

```coffeescript
query = mohair.sql 'SELECT * FROM project WHERE id = ? AND name = ?;', 7, 'foo'
```

`query.sql()` returns:

```sql
SELECT * FROM project WHERE id = ? AND name = ?;
```

`query.params()` returns:

```coffeescript
[7, 'foo']
```

### Query language

inspired by the [mongo query language](http://www.mongodb.org/display/DOCS/Advanced+Queries)

#### query objects

sql is generated from query objects by using the keys as column names,
binding the values and interspersing 'AND':

```coffeescript
mohair = require 'mohair'

query = mohair.query
    id: 7
    hidden: true
    name: mohair.sql "'Another project'"
```

`query.sql()` returns:

```sql
id = ? AND hidden = ? AND name = 'Another project'
```

`query.params()` returns:

```coffeescript
[7, true]
```

#### comparison operators

you can change the default comparison operator '=' as follows:

```coffeescript
mohair = require 'mohair'

query = mohair.query
    id: 7
    name: {$ne: -> quoted 'Another project'}
    owner_id: {$lt: 10}
    category_id: {$lte: 4}
    deadline: {$gt: mohair.sql 'NOW()'}
    cost: {$gte: 7000}
```

`query.sql()` returns:

```sql
id = ? AND
name != 'Another project' AND
owner_id < ? AND
category_id <= ? AND
deadline > NOW() AND
cost >= ?
```

`query.params()` returns:

```coffeescript
[7, 10, 4, 7000]
```

##### $in

select rows where column `id` has one of the values: `3, 5, 8, 9`:

```coffeescript
mohair = require 'mohair'

query = mohair.query
    id: {$in: [3, 5, 8, 9]}
```

`query.sql()` returns:

```sql
id IN (?, ?, ?, ?)
```

`query.params()` returns:

```coffeescript
[3, 5, 8, 9]
```

##### $nin = not in

##### $not

the special key `$not` takes a query object and negates it:

```coffeescript
mohair = require 'mohair'

query = mohair.query
    $not: {id: {$in: [3, 5, 8, 9]}}
```

`query.sql()` returns:

```sql
NOT (id IN (?, ?, ?, ?))
```

`query.params()` returns:

```coffeescript
[3, 5, 8, 9]
```

##### $or

the special key `$or` takes an array of query objects and generates a querystring
where only one of the queries must match:

```coffeescript
mohair = require 'mohair'

query = mohair.query
    $or: [
        {id: 7}
        {name: mohair.sql "'Another project'"}
        {owner_id: 10}
    ]
```

`query.sql()` returns:

```sql
id = ? OR name = 'Another project' OR owner_id = ?
```

`query.params()` returns:

```coffeescript
[7, 10]
```

##### $nor

shorthand for `{$not: {$or: ...}}`

##### $and

the special key `$and` takes an array of query objects and generates a querystring
where all of the queries must match.
`$and` and `$or` can be nested:

```coffeescript
mohair = require 'mohair'

query = mohair.query
    id: 7
    $or: [
        {owner_id: 10}
        $and: [
            {cost: {$gt: 500}}
            {cost: {$lt: 1000}}
        ]
    ]
```

`query.sql()` returns:

```sql
id = ? AND (owner_id = ? OR cost > ? AND cost < ?)
```

`query.params()` returns:

```coffeescript
[7, 10, 500, 1000]
```

### License: MIT
