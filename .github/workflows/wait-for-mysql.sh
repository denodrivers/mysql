#!/bin/sh

echo "Waiting for MySQL"
until echo '\q' | mysql -h 127.0.0.1 -uroot -P 3306 &> /dev/null
do
    >&2 echo "MySQL is waking up"
    sleep 10
done
echo "Success waiting for MySQL"