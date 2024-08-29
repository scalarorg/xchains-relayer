#!/bin/sh
#.1 create database and tables (waiting for postgres to be ready)
npx prisma db push
#.2 generate db types
npx prisma generate

yarn start:dev
