update_gateway() {

    cat ./data/$ENV/evm.json | jq -c '.[]' | while read evm; do
        # for each chain in the evm.json file, find the chain id and gateway address
        ID=$(echo $evm | jq -r '.id')
        ADDRESSES_FILE=./chains/${ID}/addresses.json

        GATEWAY=$(cat ${ADDRESSES_FILE} | jq -r '.gateway')

        echo "Update gateway address $GATEWAY for chain: $ID"

        # write the GATEWAY to the "gateway" field in the evm.json file
        jq --arg chain_id $ID --arg gateway $GATEWAY '( .[] | select(.id == $chain_id) ).gateway |= $gateway' ./data/$ENV/evm.json >./data/$ENV/evm.json.tmp && mv ./data/$ENV/evm.json.tmp ./data/$ENV/evm.json

    done
}

dev() {
    if [ -n "$ENV" ]; then
        echo "ENV is set to $ENV"
    else
        echo "ENV is not set"
        echo "Set default ENV to local"
        ENV=local
    fi

    rm -r chains
    rm .env
    mkdir -p data/${ENV}

    cp -r ../.testnets/relayer/data/${ENV} ./data
    cp -r ../.testnets/chains ./chains
    cp -r ../config/chains/${ENV} ./chains

    cp ../envs/${ENV}/relayer.env .env
    cat ../envs/${ENV}/xchains_init.env >>.env
    echo "CONFIG_CHAINS=./chains" >>.env
    echo "\nPORT=12345" >>.env

    update_gateway

    find ./.env -type f -print0 | xargs -0 sed -i '' "s#DATABASE_URL=.*#DATABASE_URL=postgresql://postgres:postgres@localhost:5442/relayer#g"

    find ./.env -type f -print0 | xargs -0 sed -i '' "s#LOCAL_RPC_URL=.*#LOCAL_RPC_URL=http://localhost:8545#g"

    # replace all scalarnode1 with localhost
    find ./data/${ENV} -type f -print0 | xargs -0 sed -i '' "s#scalarnode1#localhost#g"

    # replace all scalarnode1 with localhost
    find ./data/${ENV}/evm.json -type f -print0 | xargs -0 sed -i '' "s#http://evm-local:8545#http://localhost:8545#g"

    find ./data/${ENV}/rabbitmq.json -type f -print0 | xargs -0 sed -i '' "s#\"host\": \".*\"#\"host\": \"localhost\"#g"

    find ./data/${ENV}/btc.json -type f -print0 | xargs -0 sed -i '' "s#\"host\": \".*\"#\"host\": \"localhost\"#g"

     find ./data/${ENV}/btc-signer.json -type f -print0 | xargs -0 sed -i '' "s#\"host\": \".*\"#\"host\": \"localhost\"#g" 

    ./entrypoint.sh
};

migrate_db() {
    NAME=$1
    if [ -z "$NAME" ]; then
        echo "Please provide a migration name"
        exit 1
    fi

    npx prisma migrate dev --name $NAME
    npx prisma generate
}

$@
