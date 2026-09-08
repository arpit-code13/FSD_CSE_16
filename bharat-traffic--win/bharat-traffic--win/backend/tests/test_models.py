from datetime import datetime, timezone

from app.models import (
    City,
    Corridor,
    EmergencyRoute,
    Incident,
    Intersection,
    Prediction,
    Road,
    Simulation,
    SimulationResult,
    TrafficRecord,
    TrafficSignal,
    User,
    UserRole,
    Zone,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def test_user_simulation_relationship(db):
    user = User(email="ops@example.com", name="Ops", password_hash="$2b$$dummy", role=UserRole.ADMIN)
    city = City(name="Pune", state="Maharashtra")
    sim = Simulation(city=city, user=user, name="Morning peak", scenario_type="baseline")
    db.add_all([user, city, sim])
    db.commit()

    assert user.simulations[0].name == "Morning peak"
    assert sim.user is user
    assert sim.status == "pending"
    assert sim.created_at is not None
    assert sim.updated_at is not None


def test_city_zone_corridor_road_hierarchy(db):
    city = City(name="Bengaluru", state="Karnataka")
    zone = Zone(city=city, name="Whitefield", zone_type="commercial")
    corridor = Corridor(city=city, name="ORR East", road_type="arterial", length_meters=20000)
    road = Road(city=city, zone=zone, corridor=corridor, name="ITPL Road", road_type="arterial", lanes=4)
    db.add_all([city, zone, corridor, road])
    db.commit()

    assert city.zones[0] is zone
    assert city.corridors[0] is corridor
    assert road.city is city and road.zone is zone and road.corridor is corridor
    assert zone.roads[0] is road


def test_road_intersection_many_to_many(db):
    city = City(name="Delhi", state="Delhi")
    r1 = Road(city=city, name="Ring Road 1", road_type="highway")
    r2 = Road(city=city, name="Ring Road 2", road_type="highway")
    i1 = Intersection(city=city, name="AIIMS Crossing", latitude=28.56, longitude=77.20, intersection_type="signalized")
    i2 = Intersection(city=city, name="IIT Crossing", latitude=28.54, longitude=77.19, intersection_type="roundabout")
    i1.roads.extend([r1, r2])
    i2.roads.append(r1)
    db.add_all([city, r1, r2, i1, i2])
    db.commit()

    assert set(r1.intersections) == {i1, i2}
    assert i2.roads == [r1]


def test_intersection_signal_one_to_one(db):
    city = City(name="Mumbai", state="Maharashtra")
    junction = Intersection(city=city, name="Bandra Kurla", latitude=19.06, longitude=72.86, intersection_type="signalized")
    signal = TrafficSignal(intersection=junction, signal_type="adaptive", phases={"green": [30, 45], "amber": [5, 5]}, cycle_time_seconds=90)
    db.add_all([city, junction, signal])
    db.commit()

    assert junction.traffic_signal is signal
    assert signal.intersection is junction
    assert signal.is_active is True


def test_incident_with_emergency_route(db):
    city = City(name="Hyderabad", state="Telangana")
    origin = Intersection(city=city, name="Gachibowli X", latitude=17.44, longitude=78.32, intersection_type="signalized")
    dest = Intersection(city=city, name="Kondapur X", latitude=17.46, longitude=78.34, intersection_type="signalized")
    incident = Incident(
        city=city,
        intersection=dest,
        incident_type="accident",
        severity="critical",
        reported_at=_utcnow(),
    )
    route = EmergencyRoute(
        city=city,
        incident=incident,
        origin_intersection=origin,
        destination_intersection=dest,
        route_path={"nodes": ["n1", "n2", "n3"]},
        distance_meters=3500.5,
        estimated_time_seconds=420.0,
        priority="critical",
    )
    db.add_all([city, origin, dest, incident, route])
    db.commit()

    assert incident.emergency_routes == [route]
    assert route.incident is incident
    assert route.origin_intersection is origin and route.destination_intersection is dest
    assert origin.origin_routes == [route]
    assert dest.destination_routes == [route]


def test_traffic_record_and_prediction(db):
    city = City(name="Chennai", state="Tamil Nadu")
    road = Road(city=city, name="OMR", road_type="arterial")
    now = _utcnow()
    record = TrafficRecord(
        city=city,
        road=road,
        timestamp=now,
        vehicle_count=850,
        avg_speed_kmph=22.5,
        congestion_level="congested",
        vehicle_composition={"car": 400, "bike": 300, "bus": 100, "truck": 50},
    )
    prediction = Prediction(
        city=city,
        road=road,
        predicted_for=now,
        predicted_vehicle_count=920,
        predicted_avg_speed_kmph=18.0,
        predicted_congestion_level="gridlock",
        model_name="prophet-baseline",
        confidence_score=0.87,
    )
    db.add_all([city, road, record, prediction])
    db.commit()

    assert road.traffic_records[0] is record
    assert road.predictions[0] is prediction
    assert record.vehicle_composition["bike"] == 300


def test_simulation_result_cascade_delete(db):
    city = City(name="Kolkata", state="West Bengal")
    road = Road(city=city, name="EM Bypass", road_type="arterial")
    sim = Simulation(city=city, name="Signal retiming", scenario_type="signal_timing")
    result = SimulationResult(
        simulation=sim,
        road=road,
        avg_travel_time_seconds=612.0,
        avg_speed_kmph=28.4,
        total_vehicles=1250,
        max_queue_length=17,
        metrics={"waiting_time_p95": 120},
    )
    db.add_all([city, road, sim, result])
    db.commit()

    assert sim.results == [result]
    db.delete(sim)
    db.commit()
    assert db.query(SimulationResult).count() == 0
