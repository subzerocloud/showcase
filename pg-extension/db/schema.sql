set search_path = public;

drop table if exists users_tasks;
drop table if exists users;
drop table if exists tasks;
drop table if exists projects;
drop table if exists clients;
drop table if exists complex_items;

create table clients (
    id serial primary key,
    name text NOT NULL
);

create table projects (
    id serial primary key,
    name text NOT NULL,
    client_id integer, -- references clients(id)
    foreign key (client_id) references clients(id)
);

create view projects_view as select * from projects;

create table tasks (
    id serial primary key,
    name text NOT NULL,
    project_id integer, -- references projects(id)
    foreign key (project_id) references projects(id)
);

create table users (
    id serial primary key,
    name text NOT NULL
);

create table users_tasks (
    user_id integer NOT NULL, -- references users(id),
    task_id integer NOT NULL, -- references tasks(id),
    primary key (task_id, user_id),
    foreign key (user_id) references users(id),
    foreign key (task_id) references tasks(id)
);

create table complex_items (
    id serial NOT NULL,
    name text,
    settings json
);

alter sequence users_id_seq restart;
alter sequence tasks_id_seq restart;
alter sequence projects_id_seq restart;
alter sequence clients_id_seq restart;
alter sequence complex_items_id_seq restart;


insert into clients values (1, 'Microsoft');
insert into clients values (2, 'Apple');

insert into users values (1, 'Angela Martin');
insert into users values (2, 'Michael Scott');
insert into users values (3, 'Dwight Schrute');

insert into projects values (1, 'Windows 7', 1);
insert into projects values (2, 'Windows 10', 1);
insert into projects values (3, 'IOS', 2);
insert into projects values (4, 'OSX', 2);
insert into projects values (5, 'Orphan', NULL);

insert into tasks values (1, 'Design w7', 1);
insert into tasks values (2, 'Code w7', 1);
insert into tasks values (3, 'Design w10', 2);
insert into tasks values (4, 'Code w10', 2);
insert into tasks values (5, 'Design IOS', 3);
insert into tasks values (6, 'Code IOS', 3);
insert into tasks values (7, 'Design OSX', 4);
insert into tasks values (8, 'Code OSX', 4);

insert into users_tasks values (1, 1);
insert into users_tasks values (1, 2);
insert into users_tasks values (1, 3);
insert into users_tasks values (1, 4);
insert into users_tasks values (2, 5);
insert into users_tasks values (2, 6);
insert into users_tasks values (2, 7);
insert into users_tasks values (3, 1);
insert into users_tasks values (3, 5);


insert into complex_items values (1, 'One', '{"foo":{"int":1,"bar":"baz"}}');
insert into complex_items values (2, 'Two', '{"foo":{"int":1,"bar":"baz"}}');
insert into complex_items values (3, 'Three', '{"foo":{"int":1,"bar":"baz"}}');



-- update sequences on all tables to max id
select setval('users_id_seq', max(id)) from users;
select setval('tasks_id_seq', max(id)) from tasks;
select setval('projects_id_seq', max(id)) from projects;
select setval('clients_id_seq', max(id)) from clients;
select setval('complex_items_id_seq', max(id)) from complex_items;
