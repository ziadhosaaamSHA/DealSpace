<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('people', function (Blueprint $table) {
            $table->timestamp('claim_expires_at')->nullable()->after('last_activity');
            $table->unsignedBigInteger('available_for_group_id')->nullable()->after('claim_expires_at');
            $table->unsignedBigInteger('last_group_id')->nullable()->after('available_for_group_id');

            $table->foreign('available_for_group_id')->references('id')->on('groups')->nullOnDelete();
            $table->foreign('last_group_id')->references('id')->on('groups')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('people', function (Blueprint $table) {
            $table->dropForeign(['available_for_group_id']);
            $table->dropForeign(['last_group_id']);
            $table->dropColumn(['claim_expires_at', 'available_for_group_id', 'last_group_id']);
        });
    }
};
