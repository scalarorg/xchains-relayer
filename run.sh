local() {
    if [ -n "$ENV" ]; then
        echo "ENV is set to $ENV"
    else
        echo "ENV is not set"
        echo "Set default ENV to local"
        ENV=local
    fi

    rm -r data
    rm -r chains

    cp ../.testnets/relayer/.env.${ENV} .env
    cp -r ../.testnets/relayer/data/${ENV} ./data
    cp -r ../config/chains/${ENV} ./chains


    find ./.env -type f -print0 | xargs -0 sed -i '' "s#DATABASE_URL=.*#DATABASE_URL=postgresql://postgres:postgres@localhost:5442/relayer#g"

    ./entrypoint.sh 
}

local

$@
